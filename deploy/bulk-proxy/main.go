package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type step struct {
	Method string          `json:"method"`
	Suffix string          `json:"suffix"`
	Body   json.RawMessage `json:"body,omitempty"`
}

type bulkItem struct {
	Serial string          `json:"serial"`
	Method string          `json:"method"`
	Suffix string          `json:"suffix"`
	Body   json.RawMessage `json:"body,omitempty"`
	Steps  []step          `json:"steps,omitempty"`
}

type bulkRequest struct {
	Serials        []string        `json:"serials,omitempty"`
	Method         string          `json:"method,omitempty"`
	Suffix         string          `json:"suffix,omitempty"`
	Body           json.RawMessage `json:"body,omitempty"`
	Items          []bulkItem      `json:"items,omitempty"`
	IncludeResults bool            `json:"include_results,omitempty"`
}

type failedItem struct {
	Serial string `json:"serial"`
	Error  string `json:"error"`
	Status int    `json:"status,omitempty"`
}

type successResult struct {
	Serial string          `json:"serial"`
	Body   json.RawMessage `json:"body,omitempty"`
}

type bulkResponse struct {
	OK      int             `json:"ok"`
	Total   int             `json:"total"`
	Failed  []failedItem    `json:"failed"`
	Results []successResult `json:"results,omitempty"`
}

func main() {
	orchBase := env("ORCH_HTTP", "http://phone-orchestrator:9090")
	minioBase := env("MINIO_HTTP", "http://minio:9000")
	listen := env("BULK_LISTEN", ":8081")
	maxConc := envInt("BULK_MAX_CONCURRENCY", 64)
	timeout := time.Duration(envInt("BULK_TIMEOUT_SEC", 120)) * time.Second

	client := &http.Client{Timeout: timeout}

	http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	http.HandleFunc("/preview/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "only GET", http.StatusMethodNotAllowed)
			return
		}
		serial, err := url.PathUnescape(strings.TrimPrefix(r.URL.Path, "/preview/"))
		if err != nil || strings.TrimSpace(serial) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "serial required"})
			return
		}

		status, errMsg, body := callOrch(client, orchBase, bulkItem{
			Serial: serial,
			Method: http.MethodGet,
			Suffix: "/screen?timeout_sec=15",
		})
		if errMsg != "" {
			writeJSON(w, status, map[string]string{"error": errMsg})
			return
		}

		var screen struct {
			MinioKey      string `json:"minio_key"`
			ScreenshotURL string `json:"screenshot_url"`
			Resolution    struct {
				Width  int `json:"width"`
				Height int `json:"height"`
			} `json:"resolution"`
		}
		if err := json.Unmarshal(body, &screen); err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "invalid screen response"})
			return
		}

		imgURL, err := minioInternalURL(minioBase, screen.MinioKey, screen.ScreenshotURL)
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
			return
		}

		imgReq, err := http.NewRequestWithContext(r.Context(), http.MethodGet, imgURL, nil)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		imgRes, err := client.Do(imgReq)
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
			return
		}
		defer imgRes.Body.Close()

		if imgRes.StatusCode < 200 || imgRes.StatusCode >= 300 {
			raw, _ := io.ReadAll(io.LimitReader(imgRes.Body, 4<<10))
			msg := strings.TrimSpace(string(raw))
			if msg == "" {
				msg = imgRes.Status
			}
			writeJSON(w, imgRes.StatusCode, map[string]string{"error": msg})
			return
		}

		ct := imgRes.Header.Get("Content-Type")
		if ct == "" {
			ct = "image/png"
		}
		w.Header().Set("Content-Type", ct)
		w.Header().Set("Cache-Control", "no-store")
		if screen.Resolution.Width > 0 && screen.Resolution.Height > 0 {
			w.Header().Set("X-Screen-Width", strconv.Itoa(screen.Resolution.Width))
			w.Header().Set("X-Screen-Height", strconv.Itoa(screen.Resolution.Height))
		}
		_, _ = io.Copy(w, io.LimitReader(imgRes.Body, 8<<20))
	})

	http.HandleFunc("/orch", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "only POST", http.StatusMethodNotAllowed)
			return
		}

		var req bulkRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 4<<20)).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
			return
		}

		items, err := expandItems(req)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		if len(items) == 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "no items"})
			return
		}

		sem := make(chan struct{}, maxConc)
		var mu sync.Mutex
		resp := bulkResponse{Total: len(items)}
		includeResults := req.IncludeResults
		var wg sync.WaitGroup

		for _, item := range items {
			wg.Add(1)
			go func(it bulkItem) {
				defer wg.Done()
				sem <- struct{}{}
				defer func() { <-sem }()

				status, errMsg, body := runItem(client, orchBase, it)
				mu.Lock()
				defer mu.Unlock()
				if errMsg == "" {
					resp.OK++
					if includeResults {
						resp.Results = append(resp.Results, successResult{
							Serial: it.Serial,
							Body:   body,
						})
					}
					return
				}
				resp.Failed = append(resp.Failed, failedItem{
					Serial: it.Serial,
					Error:  errMsg,
					Status: status,
				})
			}(item)
		}

		wg.Wait()
		writeJSON(w, http.StatusOK, resp)
	})

	log.Printf("bulk-proxy listen=%s orch=%s minio=%s concurrency=%d", listen, orchBase, minioBase, maxConc)
	log.Fatal(http.ListenAndServe(listen, nil))
}

func expandItems(req bulkRequest) ([]bulkItem, error) {
	if len(req.Items) > 0 {
		out := make([]bulkItem, 0, len(req.Items))
		for _, it := range req.Items {
			if strings.TrimSpace(it.Serial) == "" {
				return nil, fmt.Errorf("item serial required")
			}
			if it.Method == "" && len(it.Steps) == 0 {
				it.Method = http.MethodGet
			}
			if it.Method == "" && it.Suffix == "" && len(it.Steps) == 0 {
				return nil, fmt.Errorf("item method or steps required")
			}
			out = append(out, it)
		}
		return out, nil
	}

	if len(req.Serials) == 0 || req.Suffix == "" {
		return nil, fmt.Errorf("need items or serials+suffix")
	}
	method := req.Method
	if method == "" {
		method = http.MethodPost
	}
	out := make([]bulkItem, 0, len(req.Serials))
	for _, serial := range req.Serials {
		if strings.TrimSpace(serial) == "" {
			continue
		}
		out = append(out, bulkItem{
			Serial: serial,
			Method: method,
			Suffix: req.Suffix,
			Body:   req.Body,
		})
	}
	return out, nil
}

func runItem(client *http.Client, base string, item bulkItem) (int, string, json.RawMessage) {
	if len(item.Steps) > 0 {
		var lastBody json.RawMessage
		for _, st := range item.Steps {
			method := st.Method
			if method == "" {
				method = http.MethodPost
			}
			status, errMsg, body := callOrch(client, base, bulkItem{
				Serial: item.Serial,
				Method: method,
				Suffix: st.Suffix,
				Body:   st.Body,
			})
			if errMsg != "" {
				return status, errMsg, nil
			}
			lastBody = body
		}
		return http.StatusOK, "", lastBody
	}
	return callOrch(client, base, item)
}

func callOrch(client *http.Client, base string, item bulkItem) (int, string, json.RawMessage) {
	path := "/phones/" + url.PathEscape(item.Serial) + item.Suffix
	target := strings.TrimRight(base, "/") + path

	var body io.Reader
	if len(item.Body) > 0 && string(item.Body) != "null" {
		body = bytes.NewReader(item.Body)
	}

	req, err := http.NewRequest(item.Method, target, body)
	if err != nil {
		return 0, err.Error(), nil
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	res, err := client.Do(req)
	if err != nil {
		return 0, err.Error(), nil
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(io.LimitReader(res.Body, 64<<10))
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		msg := strings.TrimSpace(string(raw))
		if msg == "" {
			msg = res.Status
		}
		return res.StatusCode, msg, nil
	}
	if len(raw) == 0 {
		return res.StatusCode, "", nil
	}
	return res.StatusCode, "", json.RawMessage(raw)
}

func minioInternalURL(minioBase, minioKey, screenshotURL string) (string, error) {
	base := strings.TrimRight(minioBase, "/")
	if strings.HasPrefix(minioKey, "noop://") || strings.HasPrefix(screenshotURL, "noop://") {
		return "", fmt.Errorf("screenshot storage unavailable")
	}
	if minioKey != "" {
		return base + "/af-screenshots/" + minioObjectPath(minioKey), nil
	}
	if screenshotURL == "" {
		return "", fmt.Errorf("no screenshot reference")
	}
	if strings.HasPrefix(screenshotURL, "http://") || strings.HasPrefix(screenshotURL, "https://") {
		u, err := url.Parse(screenshotURL)
		if err != nil {
			return "", err
		}
		return base + u.Path, nil
	}
	if strings.HasPrefix(screenshotURL, "af-screenshots/") {
		return base + "/" + screenshotURL, nil
	}
	return base + "/af-screenshots/" + minioObjectPath(screenshotURL), nil
}

func minioObjectPath(key string) string {
	key = strings.TrimPrefix(key, "af-screenshots/")
	parts := strings.Split(key, "/")
	for i, part := range parts {
		parts[i] = url.PathEscape(part)
	}
	return strings.Join(parts, "/")
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}
