import { useMemo, useState } from 'react'
import { ChevronRight, FileCode2, Layers, Search, X } from 'lucide-react'
import { ScenarioPhoneModal } from '@/components/ScenarioPhoneModal'
import { PageHeader } from '@/components/RequirePhone'
import { SelectionBanner } from '@/components/SelectionBanner'
import { ActionButton } from '@/components/ActionButton'
import { useBulkAction } from '@/hooks/useBulkAction'
import { useTargetPhones } from '@/hooks/useTargetPhones'
import { SHARED_SCENARIO_SERIAL } from '@/lib/sharedScenarios'
import { filterPhonesByStandSeqQuery, sortPhonesByStandSeq } from '@/lib/phoneSort'
import type { Phone } from '@/types'

function phoneLabel(phone: Phone) {
  const stand = phone.stand_seq_number != null ? `#${phone.stand_seq_number}` : null
  const model = phone.model?.trim()
  if (stand && model) return `${stand} · ${model}`
  if (stand) return stand
  if (model) return model
  return phone.serial
}

export function ScenariosPage() {
  const { hasSelection, label, isMulti, targetPhones, serials } = useBulkAction()
  const { phones } = useTargetPhones()
  const allFarmSerials = phones.map((p) => p.serial)
  const [yamlSerial, setYamlSerial] = useState<string | null>(null)
  const [sharedOpen, setSharedOpen] = useState(false)
  const [standSeqQuery, setStandSeqQuery] = useState('')

  const sortedTargetPhones = useMemo(
    () => sortPhonesByStandSeq(targetPhones),
    [targetPhones],
  )
  const filteredPhones = useMemo(
    () => filterPhonesByStandSeqQuery(sortedTargetPhones, standSeqQuery),
    [sortedTargetPhones, standSeqQuery],
  )
  const isFiltering = standSeqQuery.trim().length > 0

  return (
    <div className="max-w-md mx-auto">
      <PageHeader
        title="Сценарии"
        description="Конструктор шагов по телефону или общие шаблоны для нескольких устройств"
      />

      <ActionButton
        variant="secondary"
        className="w-full text-sm mb-4"
        icon={<Layers className="h-4 w-4" />}
        onClick={() => setSharedOpen(true)}
      >
        Общие сценарии
      </ActionButton>

      {!hasSelection ? (
        <p className="text-sm text-muted text-center">
          Выберите телефоны на главной, чтобы редактировать сценарии по устройству
        </p>
      ) : (
        <>
          <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              inputMode="numeric"
              placeholder="Поиск по № стенда"
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

          <p className="text-[11px] text-muted mb-2">
            Сценарий на телефон
            {isFiltering && (
              <span className="ml-1">
                · {filteredPhones.length} из {sortedTargetPhones.length}
              </span>
            )}
          </p>
          {filteredPhones.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">Нет телефонов по запросу «{standSeqQuery.trim()}»</p>
          ) : (
          <ul className="space-y-1.5">
            {filteredPhones.map((phone) => (
              <li key={phone.serial}>
                <button
                  type="button"
                  onClick={() => setYamlSerial(phone.serial)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface-3 px-3 py-2 text-left hover:border-slate-600 hover:bg-surface-2 transition-colors"
                >
                  <FileCode2 className="h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-200 truncate">{phoneLabel(phone)}</div>
                    <div className="text-[11px] font-mono text-muted truncate">{phone.serial}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
          )}
        </>
      )}

      {yamlSerial && (() => {
        const phone = targetPhones.find((p) => p.serial === yamlSerial)
        return (
          <ScenarioPhoneModal
            serial={yamlSerial}
            phoneLabel={phone ? phoneLabel(phone) : yamlSerial}
            onClose={() => setYamlSerial(null)}
          />
        )
      })()}

      {sharedOpen && (
        <ScenarioPhoneModal
          sharedMode
          serial={SHARED_SCENARIO_SERIAL}
          applyToSerials={serials}
          allFarmSerials={allFarmSerials}
          onClose={() => setSharedOpen(false)}
        />
      )}
    </div>
  )
}
