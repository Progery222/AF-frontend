const MINIO_PREFIX = import.meta.env.VITE_MINIO_API ?? '/api/minio'

const BUCKETS = ['af-screenshots', 'af-videos', 'af-content'] as const

/** Кодирует сегменты пути MinIO (serial вида 10.0.0.1:5555 ломает URL без %3A). */
function encodeObjectPath(path: string): string {
  const parts = path.replace(/^\/+/, '').split('/')
  if (parts.length === 0) return ''
  return parts.map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment))).join('/')
}

function toMinioProxyPath(objectPath: string): string {
  return `${MINIO_PREFIX}/${encodeObjectPath(objectPath)}`
}

/** Переписывает внутренние MinIO URL в прокси фронтенда. */
export function resolveMediaUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined

  const trimmed = raw.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith('/api/minio/')) {
    const rest = trimmed.slice('/api/minio/'.length)
    return toMinioProxyPath(rest)
  }

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed)
      const path = url.pathname.replace(/^\/+/, '')
      if (path) return toMinioProxyPath(path)
      return undefined
    }
  } catch {
    // not a valid absolute URL
  }

  if (trimmed.startsWith('noop://')) return undefined

  for (const bucket of BUCKETS) {
    if (trimmed.startsWith(`${bucket}/`)) {
      return toMinioProxyPath(trimmed)
    }
  }

  if (!trimmed.includes('://')) {
    return toMinioProxyPath(`af-screenshots/${trimmed.replace(/^\/+/, '')}`)
  }

  return trimmed
}
