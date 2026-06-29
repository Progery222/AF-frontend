import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { loadAuth, authHeader } from '@/lib/auth'
import { ImageOff, Loader2 } from 'lucide-react'

const BULK_BASE = import.meta.env.VITE_BULK_API ?? '/api/bulk'
const REFRESH_MS = Number(import.meta.env.VITE_LIVE_PREVIEW_INTERVAL_MS ?? 5000)

function serialStaggerMs(serial: string, intervalMs: number): number {
  let hash = 0
  for (let i = 0; i < serial.length; i++) {
    hash = (hash * 31 + serial.charCodeAt(i)) >>> 0
  }
  return hash % intervalMs
}

async function fetchPreviewBlob(serial: string): Promise<Blob> {
  const url = `${BULK_BASE}/preview/${encodeURIComponent(serial)}?t=${Date.now()}`
  const res = await fetch(url, { headers: authHeader(loadAuth()) })
  if (!res.ok) {
    const ct = res.headers.get('Content-Type') ?? ''
    if (ct.includes('application/json')) {
      const data = (await res.json()) as { error?: string }
      throw new Error(data.error || res.statusText)
    }
    throw new Error((await res.text()) || res.statusText)
  }
  return res.blob()
}

function decodeBlobUrl(blob: Blob): Promise<string> {
  const objectUrl = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(objectUrl)
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Не удалось декодировать кадр'))
    }
    img.src = objectUrl
  })
}

interface PhoneScreenPreviewProps {
  serial: string
  enabled?: boolean
  heightPx: number
  widthPx: number
  className?: string
}

export const PhoneScreenPreview = memo(function PhoneScreenPreview({
  serial,
  enabled = true,
  heightPx,
  widthPx,
  className = '',
}: PhoneScreenPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)
  const hasImageRef = useRef(false)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    blobUrlRef.current = blobUrl
  }, [blobUrl])

  useEffect(() => {
    hasImageRef.current = false
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setError(null)
    setInitialLoad(true)
  }, [serial])

  const loadPreview = useCallback(async () => {
    try {
      const blob = await fetchPreviewBlob(serial)
      const objectUrl = await decodeBlobUrl(blob)
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return objectUrl
      })
      hasImageRef.current = true
      setError(null)
    } catch (e) {
      if (!hasImageRef.current) setError((e as Error).message)
    } finally {
      setInitialLoad(false)
    }
  }, [serial])

  useEffect(() => {
    if (!enabled) return

    let intervalId: number | undefined
    let timeoutId: number | undefined

    const stagger = serialStaggerMs(serial, REFRESH_MS)
    timeoutId = window.setTimeout(() => {
      void loadPreview()
      intervalId = window.setInterval(() => {
        void loadPreview()
      }, REFRESH_MS)
    }, stagger)

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [serial, enabled, loadPreview])

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const showLoader = initialLoad && !blobUrl
  const showError = !blobUrl && !!error

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md bg-black border border-border/50 ${className}`}
      style={{ width: widthPx, height: heightPx }}
    >
      {showLoader && (
        <div className="absolute inset-0 flex items-center justify-center text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      {showError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted px-1 text-center">
          <ImageOff className="h-3.5 w-3.5 mb-0.5 opacity-70" />
          <span className="text-[8px] leading-tight line-clamp-3">{error}</span>
        </div>
      )}
      {blobUrl && (
        <img
          src={blobUrl}
          alt=""
          className="h-full w-full object-contain object-top pointer-events-none select-none"
          draggable={false}
        />
      )}
    </div>
  )
})
