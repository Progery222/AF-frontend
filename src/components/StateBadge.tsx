const STATE_STYLES: Record<string, string> = {
  working: 'bg-green-900/50 text-green-300 border-green-700',
  paused: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  error: 'bg-red-900/50 text-red-300 border-red-700',
  setting_up: 'bg-blue-900/50 text-blue-300 border-blue-700',
  new: 'bg-slate-700/50 text-slate-300 border-slate-600',
  ready: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  retired: 'bg-slate-800/50 text-slate-400 border-slate-700',
}

const STATE_LABELS: Record<string, string> = {
  working: 'работает',
  paused: 'пауза',
  error: 'ошибка',
  setting_up: 'настройка',
  new: 'новый',
  ready: 'готов',
  retired: 'выведен',
}

export function StateBadge({ state, compact = false }: { state: string; compact?: boolean }) {
  const style = STATE_STYLES[state] ?? 'bg-surface-3 text-muted border-border'
  const label = STATE_LABELS[state] ?? state
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${
        compact ? 'px-1 py-px text-[8px] leading-tight' : 'px-2 py-0.5 text-xs'
      } ${style}`}
    >
      {label}
    </span>
  )
}
