import { useState, type ReactNode } from 'react'
import {
  behaviorApi,
  type SocialNetwork,
} from '@/api/behavior'
import { api } from '@/api/orchestrator'
import { ActionButton } from '@/components/ActionButton'
import { useBehaviorJobs, statusText } from '@/hooks/useBehaviorJobs'
import { usePhoneElementConfigs } from '@/hooks/usePhoneElementConfigs'
import {
  ELEMENT_CATALOG,
  ELEMENTS_STORAGE_ID,
  type ElementId,
  type PhoneElementConfig,
} from '@/lib/scenarioElements'
import { EMPTY_VARIABLES } from '@/pages/scenarios/shared'
import type { Phone } from '@/types'
import {
  Play,
  RefreshCcw,
  Save,
  Search,
  SquareStack,
  XCircle,
} from 'lucide-react'
import { useToast } from '@/components/Toast'

function phoneShortLabel(phone: Phone) {
  if (phone.stand_seq_number != null) return `#${phone.stand_seq_number}`
  return phone.serial.slice(0, 14)
}

const ELEMENT_ICONS: Record<ElementId, ReactNode> = {
  open_tiktok: <Play className="h-4 w-4" />,
  scroll_feed: <SquareStack className="h-4 w-4" />,
  search_feed: <Search className="h-4 w-4" />,
  close_tiktok: <XCircle className="h-4 w-4" />,
}

const NETWORKS: { id: SocialNetwork; label: string }[] = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
]

async function runBehaviorElement(
  serial: string,
  elementId: Exclude<ElementId, 'scroll_feed'>,
  config: PhoneElementConfig,
) {
  switch (elementId) {
    case 'open_tiktok':
      return behaviorApi.launch(config.network, serial)
    case 'close_tiktok':
      return behaviorApi.close(config.network, serial)
    case 'search_feed': {
      const query = config.search.query.trim()
      if (!query) throw new Error('Укажите поисковый запрос')
      return behaviorApi.searchFeed(config.network, {
        serial,
        query,
        count: config.search.count,
        like_probability: config.search.likeProbability / 100,
      })
    }
  }
}

async function runScrollElement(serial: string, config: PhoneElementConfig) {
  await api.runScenarioStep(serial, {
    scenario_id: ELEMENTS_STORAGE_ID,
    step_id: 'scroll_feed',
    action: 'warmup_feed',
    params: {
      profile: 'tiktok_daily',
      phase: 'pre_publish',
      duration_sec: String(config.scroll.durationSec),
      skip_launch: 'true',
    },
    variables_yaml: EMPTY_VARIABLES,
  })
}

interface ScenarioElementsViewProps {
  phones: Phone[]
}

export function ScenarioElementsView({ phones }: ScenarioElementsViewProps) {
  const serials = phones.map((p) => p.serial)
  const { toast } = useToast()
  const { getConfig, patchConfig, saveAll, applyNetworkToAll, isLoading, saving } =
    usePhoneElementConfigs(serials)
  const { loading, jobs, setJobs, startJobs, addOrchJob } = useBehaviorJobs()
  const [runningElement, setRunningElement] = useState<ElementId | null>(null)

  const sharedNetwork = getConfig(serials[0] ?? '').network

  const handleRunElement = async (elementId: ElementId, title: string) => {
    if (elementId === 'search_feed') {
      const missing = phones.filter((p) => !getConfig(p.serial).search.query.trim())
      if (missing.length > 0) {
        toast(`Заполните запрос для: ${missing.map(phoneShortLabel).join(', ')}`, 'error')
        return
      }
    }

    setRunningElement(elementId)
    try {
      if (elementId === 'scroll_feed') {
        for (const phone of phones) {
          const config = getConfig(phone.serial)
          try {
            await runScrollElement(phone.serial, config)
            addOrchJob(phone.serial, title, 'done')
          } catch (e) {
            addOrchJob(phone.serial, title, 'request_error', (e as Error).message)
          }
        }
        toast(`${title}: отправлено на ${phones.length}`, 'success')
        return
      }

      await startJobs(elementId, title, serials, (serial) =>
        runBehaviorElement(serial, elementId, getConfig(serial)),
      )
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setRunningElement(null)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted py-4">Загрузка настроек элементов…</p>
  }

  return (
    <div className="space-y-3 max-w-lg mx-auto">
      <div className="rounded-lg border border-border bg-surface-2 p-3">
        <div className="text-xs text-muted mb-2">Соцсеть для всех выбранных</div>
        <div className="flex flex-wrap gap-1.5">
          {NETWORKS.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => applyNetworkToAll(n.id)}
              className={`rounded-lg border px-2.5 py-1 text-xs ${
                sharedNetwork === n.id
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-border bg-surface-3 text-slate-300'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
        <ActionButton
          variant="secondary"
          className="mt-2 text-xs w-full"
          icon={<Save className="h-3.5 w-3.5" />}
          loading={saving}
          onClick={async () => {
            try {
              await saveAll()
              toast('Настройки сохранены на телефоны', 'success')
            } catch (e) {
              toast((e as Error).message, 'error')
            }
          }}
        >
          Сохранить настройки
        </ActionButton>
        <p className="text-[10px] text-muted mt-1.5">
          Настройки хранятся на каждом телефоне отдельно и собираются в YAML для планировщика при сохранении.
        </p>
      </div>

      {ELEMENT_CATALOG.map((element) => (
        <section
          key={element.id}
          className="rounded-lg border border-border bg-surface-2 p-3 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                {ELEMENT_ICONS[element.id]}
                {element.title}
              </div>
              <p className="text-[11px] text-muted mt-0.5">{element.description}</p>
            </div>
            <ActionButton
              variant="primary"
              className="text-xs shrink-0 py-1 px-2"
              icon={<Play className="h-3 w-3" />}
              loading={loading === element.id || runningElement === element.id}
              onClick={() => handleRunElement(element.id, element.title)}
            >
              Запустить
            </ActionButton>
          </div>

          {(element.id === 'scroll_feed' || element.id === 'search_feed') && (
            <ul className="space-y-1.5">
              {phones.map((phone) => {
                const config = getConfig(phone.serial)
                return (
                  <li
                    key={phone.serial}
                    className="flex items-center gap-2 rounded border border-border bg-surface-3 px-2 py-1.5"
                  >
                    <span className="text-[11px] font-mono text-muted w-16 shrink-0 truncate">
                      {phoneShortLabel(phone)}
                    </span>
                    {element.id === 'scroll_feed' && (
                      <label className="flex items-center gap-1.5 text-xs flex-1">
                        <input
                          type="number"
                          min={5}
                          max={600}
                          value={config.scroll.durationSec}
                          onChange={(e) =>
                            patchConfig(phone.serial, {
                              scroll: { durationSec: Number(e.target.value) },
                            })
                          }
                          className="w-16 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-xs"
                        />
                        <span className="text-muted">сек</span>
                      </label>
                    )}
                    {element.id === 'search_feed' && (
                      <div className="flex flex-1 gap-1.5 min-w-0">
                        <input
                          value={config.search.query}
                          onChange={(e) =>
                            patchConfig(phone.serial, {
                              search: { ...config.search, query: e.target.value },
                            })
                          }
                          placeholder="запрос"
                          className="min-w-0 flex-1 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-xs"
                        />
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={config.search.count}
                          onChange={(e) =>
                            patchConfig(phone.serial, {
                              search: { ...config.search, count: Number(e.target.value) },
                            })
                          }
                          title="Сколько роликов"
                          className="w-12 rounded border border-border bg-surface-2 px-1 py-0.5 text-xs"
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {element.id === 'open_tiktok' || element.id === 'close_tiktok' ? (
            <p className="text-[10px] text-muted">
              Без доп. параметров — запускается на всех выбранных телефонах.
            </p>
          ) : null}
        </section>
      ))}

      <section className="rounded-lg border border-border bg-surface-2">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-sm font-medium">Jobs</div>
          <ActionButton
            variant="ghost"
            className="px-2 py-1 text-xs"
            icon={<RefreshCcw className="h-3 w-3" />}
            onClick={() => setJobs([])}
          >
            Очистить
          </ActionButton>
        </div>
        {jobs.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted">Запуски появятся здесь</div>
        ) : (
          <ul className="max-h-48 overflow-y-auto divide-y divide-border">
            {jobs.map((job) => (
              <li key={job.key} className="px-3 py-2 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-muted truncate">{job.serial}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 ${
                      job.status === 'done'
                        ? 'bg-green-500/15 text-green-300'
                        : job.status === 'failed' || job.status === 'request_error'
                          ? 'bg-red-500/15 text-red-300'
                          : 'bg-accent/15 text-accent'
                    }`}
                  >
                    {statusText(job.status)}
                  </span>
                </div>
                <div className="text-slate-300">{job.label}</div>
                {(job.error || job.jobId) && (
                  <div className="text-muted truncate">{job.error || job.jobId}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
