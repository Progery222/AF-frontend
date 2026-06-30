import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/api/orchestrator'
import { PageHeader } from '@/components/RequirePhone'
import { StateBadge } from '@/components/StateBadge'
import { useTargetPhones } from '@/hooks/useTargetPhones'
import {
  Activity,
  ChevronRight,
  Monitor,
  Smartphone,
  Gamepad2,
} from 'lucide-react'

export function DashboardPage() {
  const { label, hasSelection, isMulti, singleSerial, phones, serials } = useTargetPhones()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 15_000,
  })

  const selectedPhone = singleSerial
    ? phones.find((p) => p.serial === singleSerial)
    : undefined

  const statCards = stats
    ? [
        { label: 'Всего', value: stats.Total, color: 'text-slate-200' },
        { label: 'Работают', value: stats.Working, color: 'text-green-400' },
        { label: 'На паузе', value: stats.Paused, color: 'text-yellow-400' },
        { label: 'Ошибки', value: stats.Error, color: 'text-red-400' },
        { label: 'Настройка', value: stats.SettingUp, color: 'text-blue-400' },
      ]
    : []

  const quickLinks = [
    { to: '/phones', label: 'Телефоны', icon: Smartphone, desc: 'Выбор устройства' },
    { to: '/status', label: 'Статус', icon: Activity, desc: 'Готовность сервисов' },
    { to: '/controls', label: 'Управление', icon: Gamepad2, desc: 'Кнопки и жесты ленты' },
    { to: '/screen', label: 'Экран', icon: Monitor, desc: 'Скриншоты и UI' },
  ]

  return (
    <div>
      <PageHeader
        title="Дашборд"
        description="Сводка по ферме Android-устройств"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {statsLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-2 animate-pulse" />
            ))
          : statCards.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-surface-2 p-4"
              >
                <div className="text-xs text-muted">{s.label}</div>
                <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
      </div>

      {hasSelection ? (
        <div className="rounded-xl border border-border bg-surface-2 p-4 mb-8">
          <div className="text-sm text-muted mb-1">
            {isMulti ? `Выбрано телефонов: ${serials.length}` : 'Выбранный телефон'}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono">{label}</span>
            {selectedPhone && <StateBadge state={selectedPhone.state} />}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface-2 p-4 mb-8 text-sm text-muted">
          Телефон не выбран —{' '}
          <Link to="/phones" className="text-accent hover:underline">
            выберите устройство
          </Link>
        </div>
      )}

      <h2 className="text-sm font-medium text-muted mb-3">Быстрые действия</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {quickLinks.map(({ to, label: linkLabel, icon: Icon, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 rounded-xl border border-border bg-surface-2 p-4 hover:border-accent/40 hover:bg-surface-3 transition-colors group"
          >
            <div className="rounded-lg bg-surface-3 p-2 group-hover:bg-accent/20">
              <Icon className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{linkLabel}</div>
              <div className="text-xs text-muted">{desc}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  )
}
