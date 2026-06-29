import { useMemo } from 'react'
import { PhoneScreenPreview } from '@/components/PhoneScreenPreview'
import { StateBadge } from '@/components/StateBadge'
import { useLivePreviewTargets } from '@/hooks/useLivePreviewTargets'
import { usePhoneStore } from '@/store'
import { phonePortraitAspect, thumbWidthFromHeight } from '@/lib/phoneAspect'
import { Check, Smartphone } from 'lucide-react'

const REFRESH_SEC = Math.round(
  Number(import.meta.env.VITE_LIVE_PREVIEW_INTERVAL_MS ?? 5000) / 1000,
)

export function LivePreviewColumn() {
  const { livePreviewEnabled, targetPhones, narrowPanel, previewColsPerRow } =
    useLivePreviewTargets()
  const selectedSerials = usePhoneStore((s) => s.selectedSerials)
  const selectAll = usePhoneStore((s) => s.selectAll)
  const isSelected = usePhoneStore((s) => s.isSelected)
  const thumbHeight = usePhoneStore((s) => s.livePreviewThumbHeight)
  const setThumbHeight = usePhoneStore((s) => s.setLivePreviewThumbHeight)

  const minColWidth = useMemo(() => {
    const fallback = thumbWidthFromHeight(thumbHeight, phonePortraitAspect()) + 10
    if (targetPhones.length === 0) return fallback
    const widest = targetPhones.reduce((max, phone) => {
      const w = thumbWidthFromHeight(thumbHeight, phonePortraitAspect(phone))
      return Math.max(max, w)
    }, 0)
    return widest + 10
  }, [targetPhones, thumbHeight])

  const panelWidth = useMemo(() => {
    const horizontalPad = 28
    const gap = 8
    const cols = narrowPanel ? previewColsPerRow : Math.max(targetPhones.length, 1)
    const gridW = cols * minColWidth + Math.max(0, cols - 1) * gap
    return gridW + horizontalPad
  }, [narrowPanel, previewColsPerRow, targetPhones.length, minColWidth])

  if (!livePreviewEnabled) return null

  const scopeLabel = selectAll
    ? 'все'
    : selectedSerials.length > 0
      ? `выбранные (${selectedSerials.length})`
      : 'ничего не выбрано'

  const emptyMessage =
    !selectAll && selectedSerials.length === 0
      ? 'Выберите телефоны в списке слева'
      : 'Нет телефонов'

  return (
    <aside
      className={`flex flex-col border-l border-border bg-surface-2 ${
        narrowPanel ? 'shrink-0 self-start h-fit max-h-full' : 'min-w-0 flex-1 self-stretch'
      }`}
      style={narrowPanel ? { width: panelWidth } : undefined}
    >
      <div className="border-b border-border px-3 py-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Лайв-превью</h2>
          <span className="h-2 w-2 rounded-full shrink-0 bg-green-500" title="Активно" />
        </div>

        <label className="block space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>Размер</span>
            <span>{thumbHeight}px</span>
          </div>
          <input
            type="range"
            min={280}
            max={560}
            step={4}
            value={thumbHeight}
            onChange={(e) => setThumbHeight(Number(e.target.value))}
            className="w-full h-1.5 accent-accent cursor-pointer"
          />
        </label>

        <p className="text-[11px] text-muted leading-snug">
          {scopeLabel} · {targetPhones.length} устройств · ~{REFRESH_SEC} с
        </p>
      </div>

      <div className={`overflow-y-auto p-2 ${narrowPanel ? '' : 'flex-1'}`}>
        {targetPhones.length === 0 ? (
          <div className="text-center text-xs text-muted py-8 px-1">{emptyMessage}</div>
        ) : (
          <div
            className={`grid gap-2 justify-items-center ${narrowPanel ? 'w-fit' : ''}`}
            style={{
              gridTemplateColumns: narrowPanel
                ? `repeat(${previewColsPerRow}, ${minColWidth}px)`
                : `repeat(auto-fill, minmax(${minColWidth}px, ${minColWidth}px))`,
            }}
          >
            {targetPhones.map((phone) => {
              const selected = isSelected(phone.serial)
              const aspect = phonePortraitAspect(phone)
              const widthPx = thumbWidthFromHeight(thumbHeight, aspect)

              return (
                <div
                  key={phone.serial}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-1 ${
                    selected
                      ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                      : 'border-border bg-surface-3'
                  }`}
                  style={{ width: widthPx + 8 }}
                >
                  <PhoneScreenPreview
                    serial={phone.serial}
                    enabled={livePreviewEnabled}
                    heightPx={thumbHeight}
                    widthPx={widthPx}
                  />
                  <div className="flex w-full flex-col items-center gap-0.5 min-w-0 px-0.5">
                    <div className="flex items-center gap-0.5 min-w-0 w-full justify-center">
                      {selected ? (
                        <Check className="h-2.5 w-2.5 text-accent shrink-0" />
                      ) : (
                        <Smartphone className="h-2.5 w-2.5 text-muted shrink-0" />
                      )}
                      <span className="font-mono text-[8px] truncate leading-tight text-center">
                        {phone.serial}
                      </span>
                    </div>
                    {phone.stand_seq_number != null && (
                      <span className="font-mono text-[10px] font-semibold text-green-400 leading-tight">
                        № {phone.stand_seq_number}
                      </span>
                    )}
                    <StateBadge state={phone.state} compact />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
