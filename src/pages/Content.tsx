import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { ActionButton } from '@/components/ActionButton'
import { SelectionBanner } from '@/components/SelectionBanner'
import { useBulkAction } from '@/hooks/useBulkAction'
import { useScreenshotQueue } from '@/store'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { executeBulkItems, type BulkItem } from '@/lib/runOnPhones'
import { Download, List, Trash2, HardDrive, Smartphone, Send } from 'lucide-react'
import type { ScreenResult } from '@/types'

function contentStepsForKey(minioKey: string) {
  const filename = minioKey.split('/').pop() || 'screenshot.png'
  return [
    {
      method: 'POST' as const,
      suffix: '/content/register',
      body: { object_key: minioKey, filename, media_type: 'photo' },
    },
    {
      method: 'POST' as const,
      suffix: '/content/download',
      body: { object_key: minioKey },
    },
  ]
}

export function ContentPage() {
  const { hasSelection, label, isMulti, serials, singleSerial, isSingle, loading, run, runItems } =
    useBulkAction()
  const takeAll = useScreenshotQueue((s) => s.takeAll)
  const { toast } = useToast()
  const confirm = useConfirm()
  const [localLoading, setLocalLoading] = useState<string | null>(null)
  const [objectKey, setObjectKey] = useState('')

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['content', singleSerial],
    queryFn: () => api.listContent(singleSerial!),
    enabled: isSingle && !!singleSerial,
  })

  const busy = localLoading ?? loading

  const downloadQueue = async () => {
    if (!hasSelection) return
    setLocalLoading('queue')
    try {
      const items: BulkItem[] = []
      const needScreenshot: string[] = []

      for (const serial of serials) {
        const keys = takeAll(serial)
        if (keys.length === 0) {
          needScreenshot.push(serial)
          continue
        }
        for (const minioKey of keys) {
          items.push({ serial, steps: contentStepsForKey(minioKey) })
        }
      }

      if (needScreenshot.length > 0) {
        const shots = await executeBulkItems(
          needScreenshot.map((serial) => ({
            serial,
            method: 'GET' as const,
            suffix: '/screen?timeout_sec=30',
          })),
          { includeResults: true },
        )
        for (const row of shots.results ?? []) {
          const body = row.body as ScreenResult | undefined
          if (!body?.minio_key) continue
          items.push({ serial: row.serial, steps: contentStepsForKey(body.minio_key) })
        }
      }

      if (items.length === 0) {
        toast('Нет скринов для загрузки', 'error')
        return
      }

      const result = await runItems('queue', items, 'Загрузка на телефон')
      if (isSingle) refetch()
      return result
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setLocalLoading(null)
    }
  }

  const downloadItem = (contentId: string) => {
    if (!singleSerial) return
    setLocalLoading(`dl-${contentId}`)
    api
      .downloadContent(singleSerial, { content_id: contentId })
      .then(() => {
        toast('Загрузка на телефон запущена', 'success')
        refetch()
      })
      .catch((e) => toast((e as Error).message, 'error'))
      .finally(() => setLocalLoading(null))
  }

  const downloadObjectKey = () => {
    const key = objectKey.trim()
    if (!key) {
      toast('Укажите object_key', 'error')
      return
    }
    return run(
      'object-key',
      { method: 'POST', suffix: '/content/download', body: { object_key: key } },
      'Видео на телефон',
    ).then((result) => {
      if (result && isSingle) refetch()
      return result
    })
  }

  if (!hasSelection) return <NoPhoneSelected />

  const items = data?.items ?? []

  return (
    <div>
      <PageHeader
        title="Контент"
        description="Доставка файлов MinIO → телефон через content-distributor"
      />

      <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

      <div className="mb-6 rounded-lg border border-border bg-surface-2 p-4">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Object key видео</span>
          <input
            value={objectKey}
            onChange={(e) => setObjectKey(e.target.value)}
            placeholder="af-videos/job-id/output.mp4"
            className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2"
          />
        </label>
        <ActionButton
          className="mt-3"
          variant="primary"
          icon={<Send className="h-4 w-4" />}
          loading={loading === 'object-key'}
          disabled={objectKey.trim() === ''}
          onClick={downloadObjectKey}
        >
          Видео на телефон
        </ActionButton>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {isSingle && (
          <ActionButton
            icon={<List className="h-4 w-4" />}
            loading={isFetching}
            onClick={() => refetch()}
          >
            Список
          </ActionButton>
        )}
        <ActionButton
          variant="primary"
          icon={<Download className="h-4 w-4" />}
          loading={busy === 'queue'}
          onClick={downloadQueue}
        >
          Скачать (очередь скринов)
        </ActionButton>
        <ActionButton
          variant="danger"
          icon={<Smartphone className="h-4 w-4" />}
          loading={loading === 'device'}
          onClick={() =>
            run('device', { method: 'DELETE', suffix: '/content/device' }, 'Удалено с телефона')
          }
        >
          Удалить с телефона
        </ActionButton>
        <ActionButton
          variant="danger"
          icon={<HardDrive className="h-4 w-4" />}
          loading={loading === 'storage'}
          onClick={() =>
            run('storage', { method: 'DELETE', suffix: '/content/storage' }, 'Удалено из MinIO')
          }
        >
          Удалить из хранилища
        </ActionButton>
        <ActionButton
          variant="danger"
          icon={<Trash2 className="h-4 w-4" />}
          loading={loading === 'all'}
          onClick={async () => {
            const message = isMulti
              ? `Удалить весь контент на ${serials.length} телефонах?`
              : 'Удалить весь контент с телефона и из MinIO?'
            const ok = await confirm({
              title: 'Удалить весь контент?',
              message,
              confirmLabel: 'Удалить',
              cancelLabel: 'Отмена',
              variant: 'danger',
            })
            if (!ok) return
            run('all', { method: 'DELETE', suffix: '/content' }, 'Контент удалён')
          }}
        >
          Удалить всё
        </ActionButton>
      </div>

      {!isSingle && (
        <div className="rounded-xl border border-dashed border-border bg-surface-2 p-6 text-sm text-muted mb-6">
          Список файлов доступен при выборе одного телефона. Массовые операции выполняются на всех выбранных устройствах.
        </div>
      )}

      {isSingle && items.length === 0 && (
        <div className="text-center py-12 text-muted rounded-xl border border-dashed border-border">
          Нет зарегистрированного контента
        </div>
      )}

      {isSingle && items.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-3 text-muted text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Файл</th>
                <th className="px-4 py-2 font-medium">Статус</th>
                <th className="px-4 py-2 font-medium">Путь</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.content_id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{item.filename}</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3 text-muted text-xs truncate max-w-[200px]">
                    {item.device_path || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status !== 'on_device' && (
                      <ActionButton
                        variant="ghost"
                        className="py-1 px-2"
                        loading={busy === `dl-${item.content_id}`}
                        onClick={() => downloadItem(item.content_id)}
                      >
                        ↓
                      </ActionButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
