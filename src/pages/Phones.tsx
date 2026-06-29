import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, PHONES_PAGE_SIZE } from '@/api/orchestrator'
import { PageHeader } from '@/components/RequirePhone'
import { PhoneCard } from '@/components/PhoneCard'
import { ActionButton } from '@/components/ActionButton'
import { usePhoneStore } from '@/store'
import { useToast } from '@/components/Toast'
import { sortPhonesByStandSeq, filterPhonesByStandSeqQuery, filterProductionPhones } from '@/lib/phoneSort'
import { ChevronLeft, ChevronRight, RefreshCw, Search, Users, X, XCircle } from 'lucide-react'

export function PhonesPage() {
  const [page, setPage] = useState(0)
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
  const totalPages = Math.max(1, Math.ceil(phones.length / PHONES_PAGE_SIZE))
  const pagePhones = phones.slice(page * PHONES_PAGE_SIZE, (page + 1) * PHONES_PAGE_SIZE)

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

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative min-w-[12rem] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            inputMode="numeric"
            placeholder="№ стенда"
            value={standSeqQuery}
            onChange={(e) => {
              setStandSeqQuery(e.target.value)
              setPage(0)
            }}
            className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-8 text-sm placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
          />
          {standSeqQuery && (
            <button
              type="button"
              onClick={() => {
                setStandSeqQuery('')
                setPage(0)
              }}
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
          <span className="text-sm text-accent ml-1">
            Выбрано: {selectionCount}
            {!selectAll && selectedSerials.length === 1 && (
              <span className="font-mono text-slate-300 ml-1">{selectedSerials[0]}</span>
            )}
          </span>
        )}
      </div>

      {isFiltering && (
        <p className="text-sm text-muted mb-3">
          Найдено: {phones.length} из {allPhones.length}
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-200 mb-4">
          Не удалось загрузить список: {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : phones.length === 0 ? (
        <div className="text-center py-12 text-muted">
          {isFiltering ? `Нет телефонов с № стенда «${standSeqQuery.trim()}»` : 'Нет телефонов на ферме'}
        </div>
      ) : (
        <>
          <div className="grid gap-3 mb-4">
            {pagePhones.map((phone) => (
              <PhoneCard key={phone.serial} phone={phone} onToggle={handleToggle} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <ActionButton
                icon={<ChevronLeft className="h-4 w-4" />}
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Назад
              </ActionButton>
              <span className="text-sm text-muted">
                {page + 1} / {totalPages}
              </span>
              <ActionButton
                icon={<ChevronRight className="h-4 w-4" />}
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </ActionButton>
            </div>
          )}
        </>
      )}
    </div>
  )
}
