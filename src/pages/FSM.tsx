import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { ActionButton } from '@/components/ActionButton'
import { SelectionBanner } from '@/components/SelectionBanner'
import { StateBadge } from '@/components/StateBadge'
import { useBulkAction } from '@/hooks/useBulkAction'
import { Pause, Play, RotateCcw, Info, Server } from 'lucide-react'

export function FSMPage() {
  const { hasSelection, label, isMulti, serials, singleSerial, isSingle, loading, run } =
    useBulkAction()

  const { data: phone, refetch } = useQuery({
    queryKey: ['phone', singleSerial],
    queryFn: () => api.getPhone(singleSerial!),
    enabled: isSingle && !!singleSerial,
  })

  const { data: prov, refetch: refetchProv } = useQuery({
    queryKey: ['prov', singleSerial],
    queryFn: () => api.getProvStatus(singleSerial!),
    enabled: isSingle && !!singleSerial,
  })

  if (!hasSelection) return <NoPhoneSelected />

  return (
    <div>
      <PageHeader
        title="FSM"
        description="Пауза, возобновление и reprovision через orchestrator"
      />

      <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

      {isSingle && phone && (
        <div className="rounded-xl border border-border bg-surface-2 p-4 mb-6 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{singleSerial}</span>
            <StateBadge state={phone.state} />
          </div>
          {phone.model && <div className="text-sm text-muted">Модель: {phone.model}</div>}
          {phone.ip && <div className="text-sm text-muted">IP: {phone.ip}</div>}
          {phone.uptime_hours != null && phone.uptime_hours > 0 && (
            <div className="text-sm text-muted">Uptime: {phone.uptime_hours.toFixed(1)} ч</div>
          )}
          {phone.recovery_in_progress && (
            <div className="text-sm text-yellow-400">Recovery в процессе</div>
          )}
          {phone.error && <div className="text-sm text-red-400">Ошибка: {phone.error}</div>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-8">
        {isSingle && (
          <>
            <ActionButton
              icon={<Info className="h-4 w-4" />}
              loading={loading === 'info'}
              onClick={() => {
                refetch()
              }}
            >
              Обновить инфо
            </ActionButton>
            <ActionButton
              icon={<Server className="h-4 w-4" />}
              loading={loading === 'prov'}
              onClick={() => {
                refetchProv()
              }}
            >
              Provisioner
            </ActionButton>
          </>
        )}
        <ActionButton
          icon={<Pause className="h-4 w-4" />}
          loading={loading === 'pause'}
          onClick={() => run('pause', { method: 'POST', suffix: '/pause?reason=manual+web' }, 'Пауза')}
        >
          Пауза
        </ActionButton>
        <ActionButton
          variant="primary"
          icon={<Play className="h-4 w-4" />}
          loading={loading === 'resume'}
          onClick={() => run('resume', { method: 'POST', suffix: '/resume' }, 'Возобновление')}
        >
          Возобновить
        </ActionButton>
        <ActionButton
          variant="danger"
          icon={<RotateCcw className="h-4 w-4" />}
          loading={loading === 'reprov'}
          onClick={() => {
            const msg = isMulti
              ? `Запустить reprovision на ${serials.length} телефонах?`
              : 'Запустить reprovision? Телефон вернётся в состояние new.'
            if (!confirm(msg)) return
            run('reprov', { method: 'POST', suffix: '/reprovision' }, 'Reprovision')
          }}
        >
          Reprovision
        </ActionButton>
      </div>

      {isSingle && prov && (
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <h3 className="text-sm font-medium mb-2">Provisioner status</h3>
          <div className="text-sm space-y-1 text-muted">
            <div>Status: <span className="text-slate-200">{prov.status}</span></div>
            {prov.duration_sec != null && prov.duration_sec > 0 && (
              <div>Duration: {prov.duration_sec} сек</div>
            )}
            {prov.steps && <div>Steps: {Object.keys(prov.steps).length}</div>}
            {prov.error && <div className="text-red-400">Error: {prov.error}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
