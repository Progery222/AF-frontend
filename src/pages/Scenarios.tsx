import { useState } from 'react'
import { FileCode2, Layers } from 'lucide-react'
import { ScenarioElementsView } from '@/components/ScenarioElementsView'
import { ScenarioPhoneModal } from '@/components/ScenarioPhoneModal'
import { PageHeader } from '@/components/RequirePhone'
import { SelectionBanner } from '@/components/SelectionBanner'
import { ActionButton } from '@/components/ActionButton'
import { useBulkAction } from '@/hooks/useBulkAction'
import { useTargetPhones } from '@/hooks/useTargetPhones'
import { SHARED_SCENARIO_SERIAL } from '@/lib/sharedScenarios'
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

  return (
    <div>
      <PageHeader
        title="Сценарии"
        description="Элементы и сценарии: по телефону или общие шаблоны для нескольких устройств"
      />

      <div className="max-w-lg mx-auto mb-4">
        <ActionButton
          variant="secondary"
          className="w-full text-sm"
          icon={<Layers className="h-4 w-4" />}
          onClick={() => setSharedOpen(true)}
        >
          Общие сценарии
        </ActionButton>
        <p className="text-[10px] text-muted mt-1 text-center">
          Шаблоны без привязки к телефону — установите на выбранные или на все
        </p>
      </div>

      {!hasSelection ? (
        <p className="text-sm text-muted text-center max-w-md mx-auto">
          Выберите телефоны на главной, чтобы настраивать элементы и сценарии по устройству
        </p>
      ) : (
        <>
          <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

          <ScenarioElementsView phones={targetPhones} />

          <div className="max-w-lg mx-auto mt-4 pt-3 border-t border-border">
            <p className="text-[11px] text-muted mb-2">
              Сценарии по телефону — добавляйте шаги, задайте время начала и сохраните
            </p>
            <div className="flex flex-wrap gap-1.5">
              {targetPhones.map((phone) => (
                <ActionButton
                  key={phone.serial}
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  icon={<FileCode2 className="h-3 w-3" />}
                  onClick={() => setYamlSerial(phone.serial)}
                >
                  {phoneLabel(phone)}
                </ActionButton>
              ))}
            </div>
          </div>
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
