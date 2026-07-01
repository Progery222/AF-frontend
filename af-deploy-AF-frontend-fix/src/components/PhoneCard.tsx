import type { Phone } from '@/types'
import { StateBadge } from './StateBadge'
import { StandSeqEditor } from './StandSeqEditor'
import { usePhoneStore } from '@/store'
import { Smartphone, Check } from 'lucide-react'

interface PhoneCardProps {
  phone: Phone
  onToggle?: (serial: string) => void
  compact?: boolean
}

export function PhoneCard({ phone, onToggle, compact }: PhoneCardProps) {
  const isSelected = usePhoneStore((s) => s.isSelected(phone.serial))

  return (
    <button
      type="button"
      onClick={() => onToggle?.(phone.serial)}
      className={`w-full text-left rounded-lg border transition-all hover:border-accent/50 ${
        compact ? 'p-2' : 'rounded-xl p-3'
      } ${
        isSelected
          ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
          : 'border-border bg-surface-2 hover:bg-surface-3'
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {isSelected ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
          ) : (
            <Smartphone className="h-3.5 w-3.5 shrink-0 text-muted" />
          )}
          <span className={`truncate font-mono ${compact ? 'text-xs' : 'text-sm'}`}>{phone.serial}</span>
        </div>
        <StateBadge state={phone.state} />
      </div>
      {compact ? (
        <div className="mt-1.5 space-y-0.5 text-[10px] leading-tight text-muted">
          <StandSeqEditor serial={phone.serial} value={phone.stand_seq_number} compact />
          {phone.uptime_hours != null && phone.uptime_hours > 0 && (
            <div>{phone.uptime_hours.toFixed(1)} ч</div>
          )}
          {phone.error && <div className="truncate text-red-400">{phone.error}</div>}
        </div>
      ) : (
        <div className="mt-2 space-y-1 text-xs text-muted">
          <StandSeqEditor serial={phone.serial} value={phone.stand_seq_number} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {phone.model && <span>Модель: {phone.model}</span>}
            {phone.ip && <span>IP: {phone.ip}</span>}
            {phone.uptime_hours != null && phone.uptime_hours > 0 && (
              <span>Uptime: {phone.uptime_hours.toFixed(1)} ч</span>
            )}
            {phone.error && (
              <span className="col-span-2 text-red-400 truncate">Ошибка: {phone.error}</span>
            )}
          </div>
        </div>
      )}
    </button>
  )
}
