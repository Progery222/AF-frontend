import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api/orchestrator'
import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { SelectionBanner } from '@/components/SelectionBanner'
import { ActionButton } from '@/components/ActionButton'
import { useTargetPhones } from '@/hooks/useTargetPhones'
import { useToast } from '@/components/Toast'
import {
  executeBulkItems,
  formatBulkToast,
  type BulkItem,
} from '@/lib/runOnPhones'
import type { PhoneApp } from '@/types'
import { ExternalLink, Loader2, XCircle } from 'lucide-react'

function AppRow({
  app,
  loadingOpen,
  loadingClose,
  onOpen,
  onClose,
}: {
  app: PhoneApp
  loadingOpen: boolean
  loadingClose: boolean
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-slate-100">{app.name}</p>
        <p className="truncate text-xs text-muted font-mono">{app.package}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <ActionButton
          variant="primary"
          icon={<ExternalLink className="h-4 w-4" />}
          loading={loadingOpen}
          onClick={onOpen}
          className="flex-1 sm:flex-none"
        >
          Открыть
        </ActionButton>
        <ActionButton
          variant="ghost"
          icon={<XCircle className="h-4 w-4" />}
          loading={loadingClose}
          onClick={onClose}
          className="flex-1 sm:flex-none"
        >
          Закрыть
        </ActionButton>
      </div>
    </div>
  )
}

export function AppsPage() {
  const { hasSelection, label, isMulti, serials } = useTargetPhones()
  const { toast } = useToast()
  const [apps, setApps] = useState<PhoneApp[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const catalogSerial = serials[0]

  const loadCatalog = useCallback(async () => {
    if (!catalogSerial) return
    setCatalogLoading(true)
    try {
      const data = await api.listApps(catalogSerial)
      setApps(data.apps ?? [])
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setCatalogLoading(false)
    }
  }, [catalogSerial, toast])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const runAppAction = async (kind: 'open' | 'close', app: PhoneApp) => {
    if (!hasSelection) return
    const actionId = `${kind}:${app.package}`
    setActionLoading(actionId)
    try {
      const items: BulkItem[] = serials.map((serial) => ({
        serial,
        method: 'POST',
        suffix: kind === 'open' ? '/apps/open' : '/apps/close',
        body: { package: app.package },
      }))
      const result = await executeBulkItems(items)
      const verb = kind === 'open' ? 'Открыто' : 'Закрыто'
      const { message, type } = formatBulkToast(`${verb}: ${app.name}`, result)
      toast(message, type)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (!hasSelection) {
    return <NoPhoneSelected />
  }

  return (
    <div>
      <PageHeader
        title="Приложения"
        description="Системные приложения: открытие и закрытие на выбранных телефонах. Соцсети — на вкладке «Соцсети»."
      />
      <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

      {catalogLoading ? (
        <div className="flex items-center gap-2 text-muted py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          Загрузка каталога…
        </div>
      ) : apps.length === 0 ? (
        <div className="py-8 text-center text-muted">Каталог пуст</div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <AppRow
              key={app.id}
              app={app}
              loadingOpen={actionLoading === `open:${app.package}`}
              loadingClose={actionLoading === `close:${app.package}`}
              onOpen={() => void runAppAction('open', app)}
              onClose={() => void runAppAction('close', app)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
