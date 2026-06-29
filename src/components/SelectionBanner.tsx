export function SelectionBanner({
  label,
  isMulti,
  count,
}: {
  label: string
  isMulti?: boolean
  count: number
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4 mb-6">
      <div className="text-sm text-muted">Цель действий</div>
      <div className="font-mono text-sm mt-1 break-all">{label}</div>
      {isMulti && (
        <div className="text-xs text-accent mt-2">
          Массовое действие на {count} устройств
        </div>
      )}
    </div>
  )
}
