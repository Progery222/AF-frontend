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
      className={`w-full text-left rounded-xl border p-3 transition-all hover:border-accent/50 ${
        isSelected
          ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
          : 'border-border bg-surface-2 hover:bg-surface-3'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isSelected ? (
            <Check className="h-4 w-4 shrink-0 text-accent" />
          ) : (
            <Smartphone className="h-4 w-4 shrink-0 text-muted" />
          )}
          <span className="font-mono text-sm truncate">{phone.serial}</span>
        </div>
        <StateBadge state={phone.state} />
      </div>
      {!compact && (
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
