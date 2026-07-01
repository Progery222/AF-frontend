import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { PageHeader } from '@/components/RequirePhone'
import { PhoneCard } from '@/components/PhoneCard'
import { ActionButton } from '@/components/ActionButton'
import { usePhoneStore } from '@/store'
import { useToast } from '@/components/Toast'
import { sortPhonesByStandSeq, filterPhonesByStandSeqQuery, filterProductionPhones } from '@/lib/phoneSort'
import { RefreshCw, Search, Users, X, XCircle } from 'lucide-react'

const PHONE_GRID =
  'grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'

export function PhonesPage() {
  const [standSeqQuery, setStandSeqQuery] = useState('')
  const toggleSerial = usePhoneStore((s) => s.toggleSerial)
  const setSelectAll = usePhoneStore((s) => s.setSelectAll)
  const clearSelection = usePhoneStore((s) => s.clearSelection)
  const selectedSerials = usePhoneStore((s) => s.selectedSerials)
  const selectAll = usePhoneStore((s) => s.selectAll)
  const isSelected = usePhoneStore((s) => s.isSelected)
  const { toast } = useToast()

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['phones'],
    queryFn: api.getPhones,
  })

  const allPhones = useMemo(
    () => sortPhonesByStandSeq(filterProductionPhones(data?.phones ?? [])),
    [data?.phones],
  )
  const phones = useMemo(
    () => filterPhonesByStandSeqQuery(allPhones, standSeqQuery),
    [allPhones, standSeqQuery],
  )
  const allSerials = useMemo(() => allPhones.map((p) => p.serial), [allPhones])
  const total = data?.total ?? allPhones.length
  const isFiltering = standSeqQuery.trim().length > 0

  const selectionCount = selectAll ? allPhones.length : selectedSerials.length
  const hasSelection = selectionCount > 0

  const handleToggle = (serial: string) => {
    const wasSelected = isSelected(serial)
    toggleSerial(serial, allSerials)
    toast(
      wasSelected ? `Снят выбор: ${serial}` : `Выбран: ${serial}`,
      wasSelected ? 'info' : 'success',
    )
  }

  const handleSelectAll = () => {
    if (allPhones.length === 0) return
    setSelectAll(true)
    toast(`Выбраны все телефоны (${allPhones.length})`, 'success')
  }

  return (
    <div>
      <PageHeader
        title="Телефоны"
        description={`Устройств на ферме: ${total}. Клик по карточке — выбор/снятие. Можно выбрать несколько.`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            inputMode="numeric"
            placeholder="№ стенда"
            value={standSeqQuery}
            onChange={(e) => setStandSeqQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-8 text-sm placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
          {standSeqQuery && (
            <button
              type="button"
              onClick={() => setStandSeqQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-slate-200"
              title="Очистить"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <ActionButton
          icon={<RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />}
          onClick={() => refetch()}
          loading={isFetching && !isLoading}
        >
          Обновить
        </ActionButton>
        <ActionButton
          variant="primary"
          icon={<Users className="h-4 w-4" />}
          onClick={handleSelectAll}
          disabled={allPhones.length === 0 || selectAll}
        >
          Выбрать все
        </ActionButton>
        {hasSelection && (
          <ActionButton
            variant="ghost"
            icon={<XCircle className="h-4 w-4" />}
            onClick={() => {
              clearSelection()
              toast('Выбор сброшен', 'info')
            }}
          >
            Снять выбор
          </ActionButton>
        )}
        {hasSelection && (
          <span className="ml-1 text-sm text-accent">
            Выбрано: {selectionCount}
            {!selectAll && selectedSerials.length === 1 && (
              <span className="ml-1 font-mono text-slate-300">{selectedSerials[0]}</span>
            )}
          </span>
        )}
      </div>

      {isFiltering && (
        <p className="mb-3 text-sm text-muted">
          Найдено: {phones.length} из {allPhones.length}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-200">
          Не удалось загрузить список: {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className={PHONE_GRID}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      ) : phones.length === 0 ? (
        <div className="py-12 text-center text-muted">
          {isFiltering ? `Нет телефонов с № стенда «${standSeqQuery.trim()}»` : 'Нет телефонов на ферме'}
        </div>
      ) : (
        <div className={PHONE_GRID}>
          {phones.map((phone) => (
            <PhoneCard key={phone.serial} phone={phone} onToggle={handleToggle} compact />
          ))}
        </div>
      )}
    </div>
  )
}
