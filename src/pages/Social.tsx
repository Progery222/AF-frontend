import { useEffect, useMemo, useState } from 'react'
import {
  behaviorApi,
  type BehaviorJob,
  type JobStatus,
  type SocialNetwork,
} from '@/api/behavior'
import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { SelectionBanner } from '@/components/SelectionBanner'
import { ActionButton } from '@/components/ActionButton'
import { useTargetPhones } from '@/hooks/useTargetPhones'
import { useToast } from '@/components/Toast'
import {
  AtSign,
  Heart,
  MessageCircle,
  MessageSquareText,
  Play,
  RefreshCcw,
  Search,
  Share2,
  SquareStack,
} from 'lucide-react'

const NETWORKS: { id: SocialNetwork; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
]

const TABS = ['search', 'profile', 'inbox', 'reels', 'shorts', 'fyp']
const FINAL_STATUSES: JobStatus[] = ['done', 'failed']

interface JobRow {
  key: string
  serial: string
  label: string
  jobId?: string
  status: JobStatus | 'request_error'
  error?: string
  result?: Record<string, unknown>
}

function statusText(status: JobRow['status']) {
  switch (status) {
    case 'pending':
      return 'В очереди'
    case 'running':
      return 'Выполняется'
    case 'done':
      return 'Готово'
    case 'failed':
      return 'Ошибка job'
    case 'request_error':
      return 'Ошибка запуска'
  }
}

function compactJSON(value?: Record<string, unknown>) {
  if (!value || Object.keys(value).length === 0) return ''
  return JSON.stringify(value)
}

export function SocialPage() {
  const { hasSelection, label, isMulti, serials } = useTargetPhones()
  const { toast } = useToast()
  const [network, setNetwork] = useState<SocialNetwork>('tiktok')
  const [tab, setTab] = useState('search')
  const [count, setCount] = useState(5)
  const [likeProbability, setLikeProbability] = useState(15)
  const [query, setQuery] = useState('')
  const [prompt, setPrompt] = useState('Короткий дружелюбный комментарий по теме ролика')
  const [useContext, setUseContext] = useState(true)
  const [persona, setPersona] = useState('Коротко, естественно, без агрессии и спама')
  const [mode, setMode] = useState('respond')
  const [maxTurns, setMaxTurns] = useState(1)
  const [loading, setLoading] = useState<string | null>(null)
  const [jobs, setJobs] = useState<JobRow[]>([])

  const runningJobs = useMemo(
    () => jobs.filter((job) => job.jobId && !FINAL_STATUSES.includes(job.status as JobStatus)),
    [jobs],
  )

  useEffect(() => {
    if (runningJobs.length === 0) return
    const timer = window.setInterval(() => {
      for (const row of runningJobs) {
        if (!row.jobId) continue
        behaviorApi
          .getJob(row.jobId)
          .then((job) => updateJob(row.key, fromJob(job)))
          .catch((e) => updateJob(row.key, { status: 'request_error', error: (e as Error).message }))
      }
    }, 2500)
    return () => window.clearInterval(timer)
  }, [runningJobs])

  const updateJob = (key: string, patch: Partial<JobRow>) => {
    setJobs((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const fromJob = (job: BehaviorJob): Partial<JobRow> => ({
    jobId: job.id,
    status: job.status,
    error: job.error,
    result: job.result,
  })

  const startJobs = async (
    id: string,
    actionLabel: string,
    runner: (serial: string) => Promise<BehaviorJob>,
  ) => {
    if (!hasSelection) {
      toast('Сначала выберите телефон', 'error')
      return
    }
    setLoading(id)
    const runKey = `${Date.now()}-${id}`
    const rows = serials.map((serial) => ({
      key: `${runKey}-${serial}`,
      serial,
      label: actionLabel,
      status: 'pending' as const,
    }))
    setJobs((prev) => [...rows, ...prev].slice(0, 30))

    try {
      await Promise.all(
        rows.map(async (row) => {
          try {
            const job = await runner(row.serial)
            updateJob(row.key, fromJob(job))
          } catch (e) {
            updateJob(row.key, { status: 'request_error', error: (e as Error).message })
          }
        }),
      )
      toast(`${actionLabel}: отправлено на ${rows.length}`, 'success')
    } finally {
      setLoading(null)
    }
  }

  const commonBody = (serial: string) => ({
    serial,
    count,
    like_probability: likeProbability / 100,
  })

  if (!hasSelection) return <NoPhoneSelected />

  return (
    <div>
      <PageHeader
        title="Соцсети"
        description="MVP-действия через behavior-engine: запуск, вкладки, лента, поиск, комментарии и чат"
      />

      <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section className="rounded-lg border border-border bg-surface-2 p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {NETWORKS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setNetwork(item.id)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  network === item.id
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-surface-3 text-slate-300 hover:bg-border'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActionButton
              variant="primary"
              icon={<Play className="h-4 w-4" />}
              loading={loading === 'launch'}
              onClick={() => startJobs('launch', 'Открыть приложение', (serial) => behaviorApi.launch(network, serial))}
            >
              Открыть приложение
            </ActionButton>

            <div className="flex gap-2">
              <select
                value={tab}
                onChange={(e) => setTab(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm"
              >
                {TABS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ActionButton
                icon={<SquareStack className="h-4 w-4" />}
                loading={loading === 'tab'}
                onClick={() =>
                  startJobs('tab', `Открыть вкладку ${tab}`, (serial) =>
                    behaviorApi.openTab(network, { serial, tab }),
                  )
                }
              >
                Вкладка
              </ActionButton>
            </div>

            <ActionButton
              icon={<Heart className="h-4 w-4" />}
              loading={loading === 'feed'}
              onClick={() =>
                startJobs('feed', 'Листать / лайкать', (serial) =>
                  behaviorApi.feed(network, commonBody(serial)),
                )
              }
            >
              Листать / лайкать
            </ActionButton>

            <ActionButton
              icon={<Share2 className="h-4 w-4" />}
              disabled
              title="В behavior-engine пока нет сценария repost/share"
            >
              Репост
            </ActionButton>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted">Сколько свайпов</span>
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">Вероятность лайка, %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={likeProbability}
                onChange={(e) => setLikeProbability(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2"
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface-2 p-4">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Поисковый запрос</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="travel vlog"
              className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2"
            />
          </label>
          <ActionButton
            className="mt-3 w-full"
            variant="primary"
            icon={<Search className="h-4 w-4" />}
            loading={loading === 'search'}
            disabled={query.trim() === ''}
            onClick={() =>
              startJobs('search', 'Найти ролики', (serial) =>
                behaviorApi.searchFeed(network, { ...commonBody(serial), query: query.trim() }),
              )
            }
          >
            Найти ролики
          </ActionButton>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-muted">Комментарий</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-surface-3 px-3 py-2"
            />
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={useContext}
              onChange={(e) => setUseContext(e.target.checked)}
            />
            Учитывать текущий экран
          </label>
          <ActionButton
            className="mt-3 w-full"
            icon={<MessageSquareText className="h-4 w-4" />}
            loading={loading === 'comment'}
            onClick={() =>
              startJobs('comment', 'Написать комментарий', (serial) =>
                behaviorApi.comment(network, { serial, prompt, use_context: useContext }),
              )
            }
          >
            Написать комментарий
          </ActionButton>
        </section>
      </div>

      <section className="mb-6 rounded-lg border border-border bg-surface-2 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Персона для чата</span>
            <input
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Режим</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2"
            >
              <option value="respond">respond</option>
              <option value="initiate">initiate</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Ходы</span>
            <input
              type="number"
              min={1}
              max={10}
              value={maxTurns}
              onChange={(e) => setMaxTurns(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2"
            />
          </label>
          <ActionButton
            className="self-end"
            icon={<MessageCircle className="h-4 w-4" />}
            loading={loading === 'chat'}
            disabled={network === 'youtube'}
            onClick={() =>
              startJobs('chat', 'AI-чат', (serial) =>
                behaviorApi.chat(network, { serial, persona, mode, max_turns: maxTurns }),
              )
            }
          >
            AI-чат
          </ActionButton>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface-2">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="font-medium">Jobs</div>
          <ActionButton
            variant="ghost"
            className="px-3 py-1.5"
            icon={<RefreshCcw className="h-4 w-4" />}
            onClick={() => setJobs([])}
          >
            Очистить
          </ActionButton>
        </div>
        {jobs.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            Запущенные сценарии появятся здесь.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-3 text-left text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Телефон</th>
                  <th className="px-4 py-2 font-medium">Действие</th>
                  <th className="px-4 py-2 font-medium">Статус</th>
                  <th className="px-4 py-2 font-medium">Job</th>
                  <th className="px-4 py-2 font-medium">Результат</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.key} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{job.serial}</td>
                    <td className="px-4 py-3">{job.label}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          job.status === 'done'
                            ? 'bg-green-500/15 text-green-300'
                            : job.status === 'failed' || job.status === 'request_error'
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-accent/15 text-accent'
                        }`}
                      >
                        {statusText(job.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{job.jobId || '-'}</td>
                    <td className="max-w-[320px] truncate px-4 py-3 text-xs text-muted">
                      {job.error || compactJSON(job.result) || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        <AtSign className="h-4 w-4" />
        YouTube chat недоступен: API сам вернет ошибку, потому что у YouTube нет direct messages в этом сценарии.
      </div>
    </div>
  )
}
