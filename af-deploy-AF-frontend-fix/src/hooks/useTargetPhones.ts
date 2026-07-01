import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { filterProductionPhones } from '@/lib/phoneSort'
import { usePhoneStore } from '@/store'
import type { Phone } from '@/types'

export function useTargetPhones() {
  const selectedSerials = usePhoneStore((s) => s.selectedSerials)
  const selectAll = usePhoneStore((s) => s.selectAll)
  const pruneSelectedSerials = usePhoneStore((s) => s.pruneSelectedSerials)
  const screenSizeBySerial = usePhoneStore((s) => s.screenSizeBySerial)

  const { data } = useQuery({
    queryKey: ['phones'],
    queryFn: api.getPhones,
  })

  const phones = useMemo(
    () => filterProductionPhones(data?.phones ?? []),
    [data?.phones],
  )

  const allSerials = useMemo(() => phones.map((p) => p.serial), [phones])

  useEffect(() => {
    if (phones.length === 0) return
    pruneSelectedSerials(allSerials)
  }, [phones.length, allSerials, pruneSelectedSerials])

  const targetPhones: Phone[] = useMemo(() => {
    if (selectAll) return phones
    const set = new Set(selectedSerials)
    return phones.filter((p) => set.has(p.serial))
  }, [phones, selectAll, selectedSerials])

  const serials = useMemo(() => targetPhones.map((p) => p.serial), [targetPhones])

  const hasSelection = serials.length > 0
  const isMulti = selectAll || serials.length > 1
  const isSingle = hasSelection && !isMulti
  const staleCount = selectAll ? 0 : Math.max(0, selectedSerials.length - serials.length)

  const label = selectAll
    ? `Все телефоны (${serials.length})`
    : serials.length > 1
      ? `Выбрано ${serials.length} телефонов`
      : serials[0] ?? selectedSerials[0] ?? ''

  return {
    serials,
    targetPhones,
    hasSelection,
    selectAll,
    isMulti,
    isSingle,
    staleCount,
    label,
    singleSerial: isSingle ? serials[0] : null,
    selectedSerials,
    phones,
    screenSizeBySerial,
  }
}
