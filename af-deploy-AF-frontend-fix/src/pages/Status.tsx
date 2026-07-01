import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { PageHeader } from '@/components/RequirePhone'
import { ActionButton } from '@/components/ActionButton'
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react'

const SERVICE_KEYS = [
  'observer',
  'recovery',
  'executor',
  'connector',
  'provisioner',
  'content',
  'contacts',
  'video',
] as const

export function StatusPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 15_000,
  })

  const {
    data: ready,
    isLoading: readyLoading,
    refetch: refetchReady,
    isFetching: readyFetching,
    error: readyError,
  } = useQuery({
    queryKey: ['ready'],
    queryFn: api.getReady,
    retry: false,
  })

  const statCards = stats
    ? [
        { label: 'Всего', value: stats.Total },
        { label: 'Working', value: stats.Working },
        { label: 'Paused', value: stats.Paused },
        { label: 'Error', value: stats.Error },
        { label: 'Setting up', value: stats.SettingUp },
      ]
    : []

  const isReady = ready?.status === 'ready' && !readyError

  return (
    <div>
      <PageHeader
        title="Статус"
        description="Сводка по ферме и готовность сервисов orchestrator"
      />

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Ферма</h2>
          <ActionButton
            icon={<RefreshCw className={`h-4 w-4 ${statsFetching ? 'animate-spin' : ''}`} />}
            onClick={() => refetchStats()}
          >
            Обновить
          </ActionButton>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statsLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-surface-2 animate-pulse" />
              ))
            : statCards.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-surface-2 p-3 text-center"
                >
                  <div className="text-xs text-muted">{s.label}</div>
                  <div className="text-xl font-bold mt-1">{s.value}</div>
                </div>
              ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Готовность /ready</h2>
          <ActionButton
            icon={<RefreshCw className={`h-4 w-4 ${readyFetching ? 'animate-spin' : ''}`} />}
            onClick={() => refetchReady()}
          >
            Проверить
          </ActionButton>
        </div>

        <div
          className={`rounded-xl border p-4 mb-4 flex items-center gap-3 ${
            isReady
              ? 'border-green-800 bg-green-950/30'
              : 'border-red-800 bg-red-950/30'
          }`}
        >
          {isReady ? (
            <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />
          ) : (
            <XCircle className="h-6 w-6 text-red-400 shrink-0" />
          )}
          <div>
            <div className="font-medium">
              {readyLoading ? 'Проверка…' : ready?.status ?? 'недоступен'}
            </div>
            {readyError && (
              <div className="text-sm text-red-300 mt-1">{(readyError as Error).message}</div>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {SERVICE_KEYS.map((key) => {
            const value = ready?.[key]
            const ok = !value
            return (
              <div
                key={key}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                  ok ? 'border-border bg-surface-2' : 'border-red-900 bg-red-950/20'
                }`}
              >
                <span className="font-mono">{key}</span>
                {ok ? (
                  <span className="text-green-400 text-xs">ok</span>
                ) : (
                  <span className="text-red-400 text-xs truncate max-w-[60%]">{value}</span>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
