import { useState } from 'react'
import { api } from '@/api/orchestrator'
import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { ActionButton } from '@/components/ActionButton'
import { SelectionBanner } from '@/components/SelectionBanner'
import { ScreenshotPreview } from '@/components/ScreenshotPreview'
import { ScreenshotQueuePanel } from '@/components/ScreenshotQueue'
import { useBulkAction } from '@/hooks/useBulkAction'
import { useScreenshotQueue } from '@/store'
import { useToast } from '@/components/Toast'
import { executeBulkItems, formatBulkToast } from '@/lib/runOnPhones'
import type { ScreenResult } from '@/types'
import { Camera, Eye, FileCode } from 'lucide-react'

const SCREEN_ACTIONS = {
  observe: { suffix: '/observe?timeout_sec=30', title: 'Observe' },
  screen: { suffix: '/screen?timeout_sec=30', title: 'Скриншот' },
  ui: { suffix: '/ui?timeout_sec=30', title: 'UI dump' },
} as const

export function ScreenPage() {
  const { hasSelection, label, isMulti, serials, singleSerial, isSingle } = useBulkAction()
  const addScreenshot = useScreenshotQueue((s) => s.addScreenshot)
  const { toast } = useToast()
  const [localLoading, setLocalLoading] = useState<string | null>(null)
  const [result, setResult] = useState<ScreenResult | null>(null)
  const [xmlDump, setXmlDump] = useState<string | null>(null)

  const runScreen = async (
    id: keyof typeof SCREEN_ACTIONS,
    enqueue = false,
  ) => {
    if (!hasSelection) return
    const { suffix, title } = SCREEN_ACTIONS[id]
    setLocalLoading(id)
    try {
      if (isSingle && singleSerial) {
        const apiFn =
          id === 'observe' ? api.observe : id === 'screen' ? api.screenshot : api.uiDump
        const res = await apiFn(singleSerial)
        setResult(res)
        if (res.xml_dump) setXmlDump(res.xml_dump)
        if (enqueue && res.minio_key) {
          addScreenshot(singleSerial, res.minio_key, res.screenshot_url)
        }
        toast(`${title} готов`, 'success')
        return
      }

      const bulk = await executeBulkItems(
        serials.map((serial) => ({ serial, method: 'GET', suffix })),
        { includeResults: enqueue },
      )
      if (enqueue) {
        for (const row of bulk.results ?? []) {
          const body = row.body as ScreenResult | undefined
          if (body?.minio_key) {
            addScreenshot(row.serial, body.minio_key, body.screenshot_url)
          }
        }
      }
      const { message, type } = formatBulkToast(title, bulk)
      toast(message, type)
      setResult(null)
      setXmlDump(null)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setLocalLoading(null)
    }
  }

  const busy = localLoading

  if (!hasSelection) return <NoPhoneSelected />

  return (
    <div>
      <PageHeader
        title="Экран"
        description="Скриншоты, UI dump и observe через phone-observer"
      />

      <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

      <div className="flex flex-wrap gap-2 mb-6">
        <ActionButton
          variant="primary"
          icon={<Eye className="h-4 w-4" />}
          loading={busy === 'observe'}
          onClick={() => runScreen('observe', true)}
        >
          Observe
        </ActionButton>
        <ActionButton
          variant="primary"
          icon={<Camera className="h-4 w-4" />}
          loading={busy === 'screen'}
          onClick={() => runScreen('screen', true)}
        >
          Скрин
        </ActionButton>
        <ActionButton
          icon={<FileCode className="h-4 w-4" />}
          loading={busy === 'ui'}
          onClick={() => runScreen('ui')}
        >
          UI dump
        </ActionButton>
      </div>

      <div className="space-y-4">
        {isSingle && singleSerial && <ScreenshotQueuePanel serial={singleSerial} />}
        {!isSingle && (
          <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted">
            Очереди скринов сохраняются отдельно для каждого телефона.
          </div>
        )}
        {isSingle && <ScreenshotPreview result={result} />}
        {isSingle && xmlDump && (
          <details className="rounded-xl border border-border bg-surface-2">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              XML dump ({xmlDump.length} символов)
            </summary>
            <pre className="overflow-auto max-h-96 p-4 text-xs font-mono text-muted border-t border-border">
              {xmlDump}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
