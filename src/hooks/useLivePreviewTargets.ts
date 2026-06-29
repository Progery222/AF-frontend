import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { sortPhonesByStandSeq, filterProductionPhones } from '@/lib/phoneSort'
import { usePhoneStore } from '@/store'

/** Макс. колонок в узкой панели — 6-й телефон переносится на 2-й ряд без расширения. */
export const NARROW_PREVIEW_COLS = 5

export function useLivePreviewTargets() {
  const livePreviewEnabled = usePhoneStore((s) => s.livePreviewEnabled)
  const selectedSerials = usePhoneStore((s) => s.selectedSerials)
  const selectAll = usePhoneStore((s) => s.selectAll)

  const { data } = useQuery({
    queryKey: ['phones'],
    queryFn: api.getPhones,
    enabled: livePreviewEnabled,
    refetchInterval: livePreviewEnabled ? 30_000 : false,
  })

  const phones = useMemo(() => filterProductionPhones(data?.phones ?? []), [data?.phones])

  const targetPhones = useMemo(() => {
    let list: typeof phones
    if (selectAll) list = phones
    else if (selectedSerials.length > 0) {
      const set = new Set(selectedSerials)
      list = phones.filter((p) => set.has(p.serial))
    } else {
      return []
    }
    return sortPhonesByStandSeq(list)
  }, [phones, selectAll, selectedSerials])

  const narrowPanel = livePreviewEnabled && !selectAll

  const previewColsPerRow = Math.min(Math.max(targetPhones.length, 1), NARROW_PREVIEW_COLS)

  return { livePreviewEnabled, targetPhones, narrowPanel, previewColsPerRow }
}
