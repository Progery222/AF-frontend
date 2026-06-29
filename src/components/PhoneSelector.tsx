import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { usePhoneStore } from '@/store'
import { StateBadge } from './StateBadge'
import { Smartphone, X, Users } from 'lucide-react'

export function PhoneSelector() {
  const selectedSerials = usePhoneStore((s) => s.selectedSerials)
  const selectAll = usePhoneStore((s) => s.selectAll)
  const clearSelection = usePhoneStore((s) => s.clearSelection)

  const { data } = useQuery({
    queryKey: ['phones'],
    queryFn: api.getPhones,
    enabled: selectAll || selectedSerials.length > 0,
  })

  const phones = data?.phones ?? []
  const total = data?.total ?? phones.length
  const hasSelection = selectAll || selectedSerials.length > 0

  if (!hasSelection) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-surface-2 px-3 py-2 text-sm text-muted">
        <Smartphone className="h-4 w-4" />
        <span>Телефон не выбран</span>
      </div>
    )
  }

  if (selectAll) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2">
        <Users className="h-4 w-4 text-accent shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Все телефоны</div>
          <div className="text-xs text-muted">{total} устройств</div>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="rounded p-1 text-muted hover:bg-surface-3 hover:text-slate-200"
          title="Сбросить выбор"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  if (selectedSerials.length > 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2">
        <Users className="h-4 w-4 text-accent shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Выбрано {selectedSerials.length} телефонов</div>
          <div className="text-xs text-muted font-mono truncate">
            {selectedSerials.slice(0, 3).join(', ')}
            {selectedSerials.length > 3 ? ` +${selectedSerials.length - 3}` : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="rounded p-1 text-muted hover:bg-surface-3 hover:text-slate-200"
          title="Сбросить выбор"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const serial = selectedSerials[0]
  const phone = phones.find((p) => p.serial === serial)

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
      <Smartphone className="h-4 w-4 text-accent shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-sm truncate">{serial}</div>
        {phone && (
          <div className="mt-0.5">
            <StateBadge state={phone.state} />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clearSelection}
        className="rounded p-1 text-muted hover:bg-surface-3 hover:text-slate-200"
        title="Сбросить выбор"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
