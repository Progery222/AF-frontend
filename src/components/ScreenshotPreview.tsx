import type { ScreenResult } from '@/types'
import { AuthImage } from '@/components/AuthImage'

export function ScreenshotPreview({ result }: { result: ScreenResult | null }) {
  if (!result?.screenshot_url && !result?.minio_key) return null

  return (
    <div className="rounded-xl border border-border bg-surface-2 overflow-hidden">
      <div className="px-4 py-2 border-b border-border text-sm text-muted">
        {result.package_name && <span>Приложение: {result.package_name}</span>}
        {result.resolution && (
          <span className="ml-3">
            {result.resolution.width}×{result.resolution.height}
          </span>
        )}
        {result.minio_key && (
          <span className="block mt-1 font-mono text-xs truncate">{result.minio_key}</span>
        )}
      </div>
      <AuthImage
        src={result.screenshot_url ?? result.minio_key}
        alt="Скриншот"
        className="w-full max-h-[480px] object-contain bg-black"
        fallback={
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <p className="text-sm">Превью недоступно</p>
            {result.minio_key && (
              <p className="text-xs font-mono mt-1">{result.minio_key}</p>
            )}
          </div>
        }
      />
    </div>
  )
}
