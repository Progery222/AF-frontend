import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Smartphone,
  Activity,
  Rss,
  MessageCircle,
  Monitor,
  MonitorOff,
  FolderOpen,
  Film,
  GitBranch,
  Gamepad2,
  AppWindow,
  CalendarClock,
  LogOut,
} from 'lucide-react'
import { clearAuth } from '@/lib/auth'
import { usePhoneStore } from '@/store'
import { PhoneSelector } from './PhoneSelector'
import { LivePreviewColumn } from './LivePreviewColumn'
import { useLivePreviewTargets } from '@/hooks/useLivePreviewTargets'

const NAV = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/phones', label: 'Телефоны', icon: Smartphone },
  { to: '/status', label: 'Статус', icon: Activity },
  { to: '/feed', label: 'Лента', icon: Rss },
  { to: '/social', label: 'Соцсети', icon: MessageCircle },
  { to: '/screen', label: 'Экран', icon: Monitor },
  { to: '/content', label: 'Контент', icon: FolderOpen },
  { to: '/video', label: 'Видео', icon: Film },
  { to: '/scenarios', label: 'Сценарии', icon: CalendarClock },
  { to: '/apps', label: 'Приложения', icon: AppWindow },
  { to: '/fsm', label: 'FSM', icon: GitBranch },
  { to: '/controls', label: 'Управление', icon: Gamepad2 },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const livePreviewEnabled = usePhoneStore((s) => s.livePreviewEnabled)
  const setLivePreviewEnabled = usePhoneStore((s) => s.setLivePreviewEnabled)

  const logout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface-2">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-lg font-bold tracking-tight">AF Farm</h1>
        <p className="text-xs text-muted mt-0.5">Панель управления</p>
      </div>

      <div className="px-3 py-3 border-b border-border space-y-2">
        <PhoneSelector />
        <button
          type="button"
          onClick={() => setLivePreviewEnabled(!livePreviewEnabled)}
          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            livePreviewEnabled
              ? 'border-accent/50 bg-accent/15 text-accent'
              : 'border-border bg-surface-3 text-slate-300 hover:bg-border'
          }`}
        >
          {livePreviewEnabled ? (
            <Monitor className="h-4 w-4 shrink-0" />
          ) : (
            <MonitorOff className="h-4 w-4 shrink-0" />
          )}
          <span>{livePreviewEnabled ? 'Лайв-превью: вкл' : 'Лайв-превью: выкл'}</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-accent/15 text-accent font-medium'
                      : 'text-slate-300 hover:bg-surface-3 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-surface-3 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { livePreviewEnabled, narrowPanel } = useLivePreviewTargets()

  return (
    <div className="flex h-full min-w-0">
      <Sidebar />
      <main
        className={`overflow-y-auto min-w-0 ${
          livePreviewEnabled
            ? narrowPanel
              ? 'flex-1'
              : 'shrink-0 w-max max-w-xl'
            : 'flex-1'
        }`}
      >
        <div className={`p-4 lg:p-5 ${livePreviewEnabled ? '' : 'mx-auto max-w-5xl'}`}>
          {children}
        </div>
      </main>
      <LivePreviewColumn />
    </div>
  )
}
