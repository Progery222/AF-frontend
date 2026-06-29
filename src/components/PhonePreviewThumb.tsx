import { AuthImage } from '@/components/AuthImage'
import { Loader2, WifiOff } from 'lucide-react'
import type { LivePreviewFrame } from '@/hooks/useLivePreviews'

interface PhonePreviewThumbProps {
  frame?: LivePreviewFrame
  serial: string
  cacheKey?: number
  loading?: boolean
}

export function PhonePreviewThumb({ frame, serial, cacheKey, loading }: PhonePreviewThumbProps) {
  return (
    <div className="relative aspect-[9/16] w-full rounded-lg overflow-hidden bg-black border border-border/60">
      {frame?.url ? (
        <AuthImage
          src={frame.url}
          alt={`Экран ${serial}`}
          cacheKey={cacheKey}
          className="w-full h-full object-contain"
        />
      ) : frame?.error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted px-2 text-center">
          <WifiOff className="h-5 w-5 mb-1 opacity-70" />
          <span className="text-[10px] leading-tight line-clamp-3">{frame.error}</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted">
          <Loader2 className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </div>
      )}
      {loading && frame?.url && (
        <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
      )}
    </div>
  )
}
