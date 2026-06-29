import { useEffect, useState } from 'react'
import { loadAuth } from '@/lib/auth'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { ImageOff, Loader2 } from 'lucide-react'

interface AuthImageProps {
  src?: string | null
  alt?: string
  className?: string
  fallback?: React.ReactNode
  cacheKey?: string | number
}

export function AuthImage({ src, alt = '', className, fallback, cacheKey }: AuthImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const resolved = resolveMediaUrl(src)
  const fetchUrl =
    resolved && cacheKey != null
      ? `${resolved}${resolved.includes('?') ? '&' : '?'}v=${cacheKey}`
      : resolved

  useEffect(() => {
    if (!fetchUrl) {
      setBlobUrl(null)
      setError(false)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    setLoading(true)
    setError(false)

    const auth = loadAuth()
    fetch(fetchUrl, {
      headers: auth
        ? { Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}` }
        : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fetchUrl])

  if (!resolved) return fallback ? <>{fallback}</> : null

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-black ${className ?? ''}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    )
  }

  if (error || !blobUrl) {
    return (
      fallback ?? (
        <div className={`flex flex-col items-center justify-center text-muted bg-black ${className ?? ''}`}>
          <ImageOff className="h-6 w-6 mb-1" />
          <span className="text-xs">Нет превью</span>
        </div>
      )
    )
  }

  return <img src={blobUrl} alt={alt} className={className} />
}
