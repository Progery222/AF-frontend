# AF Frontend

Веб-панель управления Android Farm — браузерный аналог [AF-tg-admin-bot](../AF-tg-admin-bot/README.md).

React SPA + nginx с прокси к orchestrator, provisioner, MinIO и sidecar **bulk-proxy** для массовых операций и лайв-превью экранов.

## Стек

| Слой | Технологии |
|------|------------|
| UI | React 19, TypeScript, Tailwind CSS 4, Lucide |
| Состояние | Zustand (выбор телефонов, лайв-превью), TanStack Query (API) |
| Сборка | Vite 7 |
| Прод | nginx (Alpine) + Go bulk-proxy в одном контейнере |

## Архитектура

```
Браузер
   │
   ▼
nginx :80  (af-frontend)
   ├── /              → dist/ (SPA)
   ├── /api/orch/*    → phone-orchestrator:9090
   ├── /api/prov/*    → phone-provisioner:19092
   ├── /api/minio/*   → minio:9000
   └── /api/bulk/*    → bulk-proxy :8081 (localhost в контейнере)
                            ├── POST /orch      — параллельные вызовы orchestrator (до 500 одновременно)
                            └── GET  /preview/{serial} — PNG скрин для лайв-превью
```

Basic Auth на всех `/api/*`. Логин в UI (`/login`) сохраняет те же credentials в `localStorage` и передаёт заголовок `Authorization` в запросах (в т.ч. превью через `fetch`).

## Массовые операции (до 500 телефонов)

Браузер **не** шлёт сотни параллельных `fetch` (лимит ~6 соединений на домен). Вместо этого:

1. UI вызывает **один** `POST /api/bulk/orch` с массивом serials или items.
2. **bulk-proxy** (Go) fan-out к orchestrator с семафором `BULK_MAX_CONCURRENCY` (**500** по умолчанию).
3. HTTP-клиент bulk-proxy держит пул соединений к orchestrator под высокую параллельность.
4. Ответ: `{ ok, total, failed[] }` — сводка по всем устройствам.

Применяется на страницах: **Лента**, **Управление**, **FSM**, **Экран**, **Контент**, **Видео**. Координаты жестов на «Ленте» масштабируются под разрешение каждого телефона.

**Ограничения downstream:** orchestrator, executor (ADB), observer и MinIO должны выдерживать нагрузку. При деградации увеличивайте `BULK_TIMEOUT_SEC` или снижайте `BULK_MAX_CONCURRENCY` в `.env`.

## Разделы панели

| Маршрут | Назначение | API orchestrator |
|---------|------------|------------------|
| `/` | Дашборд, быстрые ссылки | — |
| `/phones` | Список, выбор serial, № стенда | `GET /phones`, `PATCH …/stand-seq` |
| `/status` | Статистика фермы | `GET /stats`, `GET /ready` |
| `/feed` | Свайпы и тап по координатам (масштаб под экран) | `POST …/swipe`, `POST …/tap` |
| `/screen` | Observe, скрин, UI dump | `GET …/observe`, `…/screen`, `…/ui` |
| `/content` | Контент на телефоне / в MinIO | `GET/DELETE …/content`, `POST …/register`, `…/download` |
| `/video` | Видео из скринов, AI, jobs | `POST …/video/*`, `GET …/video/jobs/{id}` |
| `/fsm` | FSM, provisioner, pause/resume | `GET …/phones/{serial}`, `POST …/pause`, `…/resume`, `…/reprovision` |
| `/controls` | Home, Back, Recents, Power | `POST …/key` |
| `/app` | Навигация в приложении | `POST …/key` |

Полный справочник кнопок TG-бота (те же операции): [docs/tg-bot-buttons-reference.md](../docs/tg-bot-buttons-reference.md).

## Лайв-превью

Боковая колонка справа (переключатель «Лайв-превью» в шапке).

- Показывает актуальный скрин выбранных телефонов (или всех при «Выбрать все»).
- Обновление каждые ~5 с (`VITE_LIVE_PREVIEW_INTERVAL_MS`), с разнесением по serial (stagger), чтобы не бить observer одновременно.
- Ползунок «Размер» — высота превью 280–560 px; ширина по aspect ratio экрана (`screen_res_x/y` из API).
- Сортировка карточек по **№ стенда** (`stand_seq_number`), как в списке телефонов.
- В узкой панели (выбрано ≤5 телефонов) — сетка до 5 колонок; при «все» — широкая колонка.
- **Только просмотр** — клики по превью не отправляют tap на устройство. Управление — через разделы «Лента», «Управление» и т.д.

Цепочка кадра: `GET /api/bulk/preview/{serial}` → bulk-proxy → orchestrator `GET /phones/{serial}/screen` → MinIO PNG.

## Список телефонов

- Сортировка по `stand_seq_number` (без номера — в начале), затем по serial.
- Поиск по полю «№ стенда» — частичное совпадение цифр.
- Скрыты sandbox-serial: `stub`, `docker-test*`, `TEST-PHONE-*` (дублирует фильтр orchestrator на стороне UI).
- Выбор одного / нескольких / всех — для bulk-действий на других страницах и для лайв-превью.

## Локальная разработка

```bash
cd AF-frontend
cp .env.example .env
npm install
npm run dev
```

Откройте http://localhost:5173. Логин по умолчанию: `admin` / `af-admin`.

Vite проксирует `/api/orch`, `/api/prov`, `/api/minio` на локальные upstream (см. `.env.example`). Bulk `/api/bulk/orch` реализован middleware в `vite.config.ts`. В dev **нет** `/api/bulk/preview` — лайв-превью работает только в Docker/проде, где запущен bulk-proxy.

```bash
npm run build   # tsc + vite build → dist/
npm run lint    # tsc --noEmit
```

## Docker

Из корня монорепо:

```powershell
docker compose --profile frontend up -d --build af-frontend
```

Панель: http://localhost:3030 (порт `FRONTEND_HTTP_PORT` в `.env`).

Образ собирается из `deploy/Dockerfile.static`: статика + nginx + bulk-proxy. `deploy/entrypoint.sh` ждёт orchestrator, provisioner и MinIO, генерирует htpasswd-map для nginx, стартует bulk-proxy и nginx.

## Деплой на сервер

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-frontend-server.ps1
```

Скрипт: локальный `npm run build` → `scp` на сервер → `docker build --no-cache` → `docker compose --profile frontend up -d`. Проверяет, что в контейнере отдаётся актуальный JS-бандл.

Параметры по умолчанию: сервер `10.16.93.169`, путь `E:\Dev\AF`, порт `3030`.

## Переменные окружения

### Dev (`.env`, Vite)

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `VITE_ORCH_PROXY_TARGET` | `http://127.0.0.1:9092` | Upstream orchestrator |
| `VITE_PROV_PROXY_TARGET` | `http://127.0.0.1:19092` | Upstream provisioner |
| `VITE_MINIO_PROXY_TARGET` | `http://127.0.0.1:9000` | Upstream MinIO |
| `VITE_ORCH_API` | `/api/orch` | Base path API |
| `VITE_PROV_API` | `/api/prov` | Base path API |
| `VITE_MINIO_API` | `/api/minio` | Base path API |
| `VITE_BULK_API` | `/api/bulk` | Base path bulk-proxy |
| `VITE_LIVE_PREVIEW_INTERVAL_MS` | `5000` | Интервал обновления превью |
| `VITE_DEFAULT_AI_PROMPT` | `котики на закате` | Промпт AI-видео |
| `FRONTEND_AUTH_USER` | `admin` | Basic Auth (dev middleware) |
| `FRONTEND_AUTH_PASSWORD` | `af-admin` | Basic Auth |
| `BULK_MAX_CONCURRENCY` | `500` | Параллельность bulk в dev |
| `BULK_TIMEOUT_SEC` | `180` | Таймаут одного запроса к orchestrator в bulk (с) |

### Prod (контейнер)

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `FRONTEND_AUTH_USER` | `admin` | Basic Auth nginx |
| `FRONTEND_AUTH_PASSWORD` | `af-admin` | Basic Auth nginx |
| `ORCH_HTTP` | `http://phone-orchestrator:9090` | bulk-proxy → orchestrator |
| `MINIO_HTTP` | `http://minio:9000` | bulk-proxy → MinIO (скрины) |
| `BULK_MAX_CONCURRENCY` | `500` | Параллельность bulk (до ~500 телефонов одновременно) |
| `BULK_TIMEOUT_SEC` | `180` | Таймаут одного запроса к orchestrator в bulk (с) |

## MinIO: скрины и видео

| Bucket | Путь | Назначение |
|--------|------|------------|
| `af-screenshots` | `{serial}/{timestamp}.png` | Скрины с каждого телефона отдельно |
| `af-videos` | `videos/{serial}/{job-id}.mp4` | Сгенерированные MP4 per-phone |
| `af-content` | … | Файлы, доставленные на устройства |

**Очередь скринов** в UI — в `localStorage` браузера, ключ = serial. «Скачать» и «Скрины→видео» берут только скрины **выбранного** телефона.

`screenshot_url` из API переписывается клиентом в `/api/minio/...` (прокси nginx → minio:9000), чтобы браузер не ходил на внутренний хост напрямую.

## Структура каталогов

```
AF-frontend/
├── src/
│   ├── api/           — клиент orchestrator / provisioner
│   ├── components/    — UI, LivePreviewColumn, PhoneScreenPreview
│   ├── hooks/         — useLivePreviewTargets, useBulkAction
│   ├── lib/           — auth, phoneSort, feedGestures, runOnPhones (bulk)
│   ├── pages/         — маршруты SPA
│   └── store/         — Zustand (выбор телефонов, превью)
├── deploy/
│   ├── Dockerfile.static
│   ├── nginx.conf
│   ├── entrypoint.sh
│   └── bulk-proxy/    — Go sidecar
└── dist/              — артеfact сборки (в образ)
```

## Безопасность

- Авторизация: форма `/login` + nginx Basic Auth на `/api/*`.
- Панель рассчитана на локальную сеть / VPN, не выставлять в интернет без дополнительной защиты.
- Не коммитить реальные пароли; на сервере — через `.env` / переменные compose.

## Связанные сервисы

| Сервис | Роль для frontend |
|--------|-------------------|
| [AF-orkestrator](../AF-orkestrator/README.md) | Основной HTTP API |
| [AF-phone-provisioner](../AF-phone-provisioner/README.MD) | Статус provision |
| [AF-phone-observer](../AF-phone-observer/README.md) | Скрины (через orchestrator) |
| [AF-tg-admin-bot](../AF-tg-admin-bot/README.md) | Telegram-аналог тех же операций |

## Репозиторий

https://github.com/Progery222/AF-frontend — ветка `main`.
