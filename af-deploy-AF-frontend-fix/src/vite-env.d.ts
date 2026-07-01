/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORCH_API: string
  readonly VITE_PROV_API: string
  readonly VITE_MINIO_API: string
  readonly VITE_BULK_API: string
  readonly VITE_ORCH_PROXY_TARGET: string
  readonly VITE_PROV_PROXY_TARGET: string
  readonly VITE_MINIO_PROXY_TARGET: string
  readonly VITE_LIVE_PREVIEW_INTERVAL_MS: string
  readonly VITE_DEFAULT_AI_PROMPT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
