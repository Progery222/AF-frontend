import { AuthImage } from './AuthImage'
import { useScreenshotQueue } from '@/store'
import { ActionButton } from './ActionButton'
import { Trash2 } from 'lucide-react'

export function ScreenshotQueuePanel({ serial }: { serial: string }) {
  const queues = useScreenshotQueue((s) => s.queues)
  const clear = useScreenshotQueue((s) => s.clear)
  const items = queues[serial] ?? []

  if (items.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Очередь скринов: {items.length}</h3>
        <ActionButton
          variant="ghost"
          icon={<Trash2 className="h-4 w-4" />}
          onClick={() => clear(serial)}
        >
          Очистить
        </ActionButton>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <div
            key={item.minioKey}
            className="shrink-0 w-20 h-36 rounded-lg border border-border bg-black overflow-hidden"
          >
            <AuthImage
              src={item.screenshotUrl ?? item.minioKey}
              className="w-full h-full object-cover"
              fallback={
                <div className="w-full h-full flex items-center justify-center text-xs text-muted p-1 text-center">
                  {item.minioKey.split('/').pop()}
                </div>
              }
            />
          </div>
        ))}
      </div>
    </div>
  )
}
