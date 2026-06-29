import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { usePhoneStore } from '@/store'

export function useTargetPhones() {
  const selectedSerials = usePhoneStore((s) => s.selectedSerials)
  const selectAll = usePhoneStore((s) => s.selectAll)

  const { data } = useQuery({
    queryKey: ['phones'],
    queryFn: api.getPhones,
  })

  const phones = data?.phones ?? []

  const serials = selectAll
    ? phones.map((p) => p.serial)
    : selectedSerials

  const hasSelection = serials.length > 0
  const isMulti = selectAll || selectedSerials.length > 1
  const isSingle = hasSelection && !isMulti

  const label = selectAll
    ? `Все телефоны (${serials.length})`
    : selectedSerials.length > 1
      ? `Выбрано ${selectedSerials.length} телефонов`
      : selectedSerials[0] ?? ''

  return {
    serials,
    hasSelection,
    selectAll,
    isMulti,
    isSingle,
    label,
    singleSerial: isSingle ? selectedSerials[0] : null,
    selectedSerials,
    phones,
  }
}
