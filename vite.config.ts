import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const orchTarget = process.env.VITE_ORCH_PROXY_TARGET ?? 'http://127.0.0.1:9092'
const provTarget = process.env.VITE_PROV_PROXY_TARGET ?? 'http://127.0.0.1:19092'
const minioTarget = process.env.VITE_MINIO_PROXY_TARGET ?? 'http://127.0.0.1:9000'
const bulkMaxConcurrency = Number(process.env.BULK_MAX_CONCURRENCY ?? 64)
const authUser = process.env.FRONTEND_AUTH_USER ?? 'admin'
const authPass = process.env.FRONTEND_AUTH_PASSWORD ?? 'af-admin'

interface BulkOrchItem {
  serial: string
  method?: string
  suffix?: string
  body?: unknown
  steps?: { method?: string; suffix: string; body?: unknown }[]
}

async function orchFetch(
  base: string,
  item: { serial: string; method?: string; suffix?: string; body?: unknown },
) {
  const method = item.method ?? 'POST'
  const path = `/phones/${encodeURIComponent(item.serial)}${item.suffix ?? ''}`
  const res = await fetch(`${base}${path}`, {
    method,
    headers: item.body != null ? { 'Content-Type': 'application/json' } : undefined,
    body: item.body != null ? JSON.stringify(item.body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(text || res.statusText)
  }
  return text ? JSON.parse(text) : undefined
}

async function runBulkItem(base: string, item: BulkOrchItem) {
  if (item.steps?.length) {
    let last: unknown
    for (const step of item.steps) {
      last = await orchFetch(base, {
        serial: item.serial,
        method: step.method,
        suffix: step.suffix,
        body: step.body,
      })
    }
    return last
  }
  return orchFetch(base, item)
}

async function handleBulkOrch(body: {
  serials?: string[]
  method?: string
  suffix?: string
  body?: unknown
  items?: BulkOrchItem[]
  include_results?: boolean
}) {
  let items: BulkOrchItem[] = []
  if (body.items?.length) {
    items = body.items
  } else if (body.serials?.length && body.suffix) {
    items = body.serials.map((serial) => ({
      serial,
      method: body.method ?? 'POST',
      suffix: body.suffix,
      body: body.body,
    }))
  }

  const failed: { serial: string; error: string }[] = []
  const results: { serial: string; body?: unknown }[] = []
  let ok = 0
  let index = 0

  async function worker() {
    while (index < items.length) {
      const i = index++
      const item = items[i]
      try {
        const result = await runBulkItem(orchTarget, item)
        ok++
        if (body.include_results) {
          results.push({ serial: item.serial, body: result })
        }
      } catch (e) {
        failed.push({ serial: item.serial, error: (e as Error).message })
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(bulkMaxConcurrency, Math.max(items.length, 1)) },
    () => worker(),
  )
  await Promise.all(workers)

  return { ok, total: items.length, failed, results: body.include_results ? results : undefined }
}

function minioObjectPath(key: string): string {
  const trimmed = key.replace(/^af-screenshots\//, '')
  return trimmed
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/')
}

function minioInternalURL(minioKey?: string, screenshotURL?: string): string {
  const base = minioTarget.replace(/\/$/, '')
  if (minioKey?.startsWith('noop://') || screenshotURL?.startsWith('noop://')) {
    throw new Error('screenshot storage unavailable')
  }
  if (minioKey) {
    return `${base}/af-screenshots/${minioObjectPath(minioKey)}`
  }
  if (!screenshotURL) {
    throw new Error('no screenshot reference')
  }
  if (screenshotURL.startsWith('http://') || screenshotURL.startsWith('https://')) {
    const url = new URL(screenshotURL)
    return `${base}${url.pathname}`
  }
  if (screenshotURL.startsWith('af-screenshots/')) {
    return `${base}/${screenshotURL}`
  }
  return `${base}/af-screenshots/${minioObjectPath(screenshotURL)}`
}

async function handleBulkPreview(serial: string) {
  const screen = (await orchFetch(orchTarget, {
    serial,
    method: 'GET',
    suffix: '/screen?timeout_sec=15',
  })) as {
    minio_key?: string
    screenshot_url?: string
    resolution?: { width: number; height: number }
  }

  const imgURL = minioInternalURL(screen.minio_key, screen.screenshot_url)
  const imgRes = await fetch(imgURL)
  if (!imgRes.ok) {
    throw new Error(await imgRes.text().catch(() => imgRes.statusText))
  }
  return {
    body: Buffer.from(await imgRes.arrayBuffer()),
    contentType: imgRes.headers.get('Content-Type') ?? 'image/png',
    resolution: screen.resolution,
  }
}

function checkBasicAuth(req: import('http').IncomingMessage): boolean {
  const header = req.headers.authorization
  if (!header?.startsWith('Basic ')) return false
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const sep = decoded.indexOf(':')
  if (sep < 0) return false
  return decoded.slice(0, sep) === authUser && decoded.slice(sep + 1) === authPass
}

function devAuthPlugin() {
  return {
    name: 'dev-basic-auth',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0] ?? ''

        if (urlPath === '/api/bulk/orch' && req.method === 'POST') {
          if (!checkBasicAuth(req)) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json')
            res.end('{"error":"unauthorized"}')
            return
          }
          const chunks: Buffer[] = []
          req.on('data', (c) => chunks.push(c))
          req.on('end', async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
              const result = await handleBulkOrch(body)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (e) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: (e as Error).message }))
            }
          })
          return
        }

        if (urlPath.startsWith('/api/bulk/preview/') && req.method === 'GET') {
          if (!checkBasicAuth(req)) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json')
            res.end('{"error":"unauthorized"}')
            return
          }
          const serial = decodeURIComponent(urlPath.slice('/api/bulk/preview/'.length))
          if (!serial.trim()) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end('{"error":"serial required"}')
            return
          }
          try {
            const preview = await handleBulkPreview(serial)
            res.statusCode = 200
            res.setHeader('Content-Type', preview.contentType)
            res.setHeader('Cache-Control', 'no-store')
            if (preview.resolution?.width && preview.resolution?.height) {
              res.setHeader('X-Screen-Width', String(preview.resolution.width))
              res.setHeader('X-Screen-Height', String(preview.resolution.height))
            }
            res.end(preview.body)
          } catch (e) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: (e as Error).message }))
          }
          return
        }

        if (!req.url?.startsWith('/api/')) return next()
        if (checkBasicAuth(req)) return next()
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end('{"error":"unauthorized"}')
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devAuthPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/orch': {
        target: orchTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/orch/, ''),
      },
      '/api/prov': {
        target: provTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/prov/, ''),
      },
      '/api/minio': {
        target: minioTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/minio/, ''),
      },
    },
  },
})
