import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Play,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import type { SocialNetwork } from '@/api/behavior'
import { api } from '@/api/orchestrator'
import { ActionButton } from '@/components/ActionButton'
import { useConfirm } from '@/components/ConfirmDialog'
import { useToast } from '@/components/Toast'
import {
  buildYamlFromDraft,
  createStep,
  emptyDraft,
  parseDraftFromYaml,
  STEP_TYPE_CATALOG,
  stepIdAt,
  stepTypeTitle,
  type BuilderStepType,
  type ScenarioDraft,
} from '@/lib/scenarioBuilder'
import { applySharedScenarioToPhones, SHARED_SCENARIO_SERIAL } from '@/lib/sharedScenarios'
import { CollapsibleSection, EMPTY_VARIABLES, issueColor } from '@/pages/scenarios/shared'
import type { ScenarioStepIssue, ScenarioSummary } from '@/types'

const NETWORKS: { id: SocialNetwork; label: string }[] = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
]

interface ScenarioPhoneModalProps {
  serial: string
  phoneLabel?: string
  onClose: () => void
  /** Хранение в scenarios/_shared/ — шаблон для нескольких телефонов */
  sharedMode?: boolean
  /** Куда копировать шаблон (выбранные телефоны) */
  applyToSerials?: string[]
  /** Все телефоны фермы — кнопка «на все» */
  allFarmSerials?: string[]
}

export function ScenarioPhoneModal({
  serial,
  phoneLabel,
  onClose,
  sharedMode = false,
  applyToSerials = [],
  allFarmSerials = [],
}: ScenarioPhoneModalProps) {
  const storageSerial = sharedMode ? SHARED_SCENARIO_SERIAL : serial
  const yamlSerial = sharedMode ? SHARED_SCENARIO_SERIAL : serial
  const { toast } = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ScenarioDraft>(() => emptyDraft(serial))
  const [variablesYAML] = useState(EMPTY_VARIABLES)
  const [showYaml, setShowYaml] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [addStepType, setAddStepType] = useState<BuilderStepType | ''>('')
  const autoLoadedFor = useRef<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [runningNow, setRunningNow] = useState(false)
  const [selectedForRun, setSelectedForRun] = useState<Set<string>>(new Set())
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [stepIssues, setStepIssues] = useState<ScenarioStepIssue[]>([])
  const [genWarnings, setGenWarnings] = useState<string[]>([])
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [runnable, setRunnable] = useState<boolean | null>(null)

  const scenarioYAML = useMemo(() => buildYamlFromDraft(yamlSerial, draft), [yamlSerial, draft])

  const { data: listData, refetch: refetchList, isFetching: listLoading } = useQuery({
    queryKey: ['scenarios', storageSerial],
    queryFn: () => api.listScenarios(storageSerial),
    enabled: !!storageSerial,
  })

  const { data: statusData } = useQuery({
    queryKey: ['scenario-status', storageSerial, selectedId],
    queryFn: () => api.getScenarioStatus(storageSerial, selectedId!),
    enabled: !sharedMode && !!storageSerial && !!selectedId,
    refetchInterval: 30_000,
  })

  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['scenario-logs', storageSerial, selectedId, logDate],
    queryFn: () => api.getScenarioLogs(storageSerial, selectedId!, logDate),
    enabled: !sharedMode && !!storageSerial && !!selectedId,
  })

  const items = listData?.items ?? []
  const activeScenarioId = listData?.active_scenario_id ?? items.find((s) => s.is_active)?.id ?? null

  useEffect(() => {
    autoLoadedFor.current = null
  }, [storageSerial])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const loadScenario = async (id: string) => {
    try {
      const files = await api.getScenario(storageSerial, id)
      setSelectedId(id)
      setDraft(parseDraftFromYaml(files.scenario_yaml, yamlSerial))
      setStepIssues([])
      setGenWarnings([])
      setIsValid(null)
      setRunnable(null)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  useEffect(() => {
    if (!listData || autoLoadedFor.current === storageSerial) return
    const id = activeScenarioId ?? items[0]?.id
    if (!id) return
    autoLoadedFor.current = storageSerial
    void loadScenario(id)
  }, [storageSerial, listData, activeScenarioId, items])

  const newScenario = () => {
    setSelectedId(null)
    setDraft(emptyDraft(yamlSerial))
    setStepIssues([])
    setGenWarnings([])
    setIsValid(null)
    setRunnable(null)
  }

  const patchDraft = (patch: Partial<ScenarioDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const addStep = (type: BuilderStepType) => {
    setDraft((prev) => ({ ...prev, steps: [...prev.steps, createStep(type)] }))
    setAddStepType('')
  }

  const removeStep = (uid: string) => {
    setDraft((prev) => ({ ...prev, steps: prev.steps.filter((s) => s.uid !== uid) }))
  }

  const moveStep = (uid: string, dir: -1 | 1) => {
    setDraft((prev) => {
      const idx = prev.steps.findIndex((s) => s.uid === uid)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.steps.length) return prev
      const steps = [...prev.steps]
      ;[steps[idx], steps[next]] = [steps[next], steps[idx]]
      return { ...prev, steps }
    })
  }

  const patchStep = (uid: string, patch: Partial<ScenarioDraft['steps'][0]>) => {
    setDraft((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.uid === uid ? { ...s, ...patch } : s)),
    }))
  }

  const setActiveScenario = async (id: string) => {
    if (sharedMode) return
    try {
      await api.setActiveScenario(storageSerial, id)
      toast(`Активный сценарий: ${id}`, 'success')
      await refetchList()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const validateDraftYaml = async (applyNormalized = true) => {
    setValidating(true)
    try {
      const res = await api.validateScenario(storageSerial, scenarioYAML, variablesYAML, true)
      setStepIssues(res.step_issues ?? [])
      setGenWarnings(res.warnings ?? [])
      setIsValid(res.valid)
      setRunnable(res.runnable_by_scheduler ?? null)
      if (applyNormalized && res.normalized_scenario_yaml) {
        setDraft(parseDraftFromYaml(res.normalized_scenario_yaml, yamlSerial))
      }
      if (!res.valid) {
        toast(`Ошибки: ${(res.errors ?? []).join('; ') || 'см. step_issues'}`, 'error')
      } else if ((res.warnings ?? []).length > 0) {
        toast(`Валидно с предупреждениями (${res.warnings!.length})`, 'success')
      } else {
        toast('Сценарий валиден', 'success')
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setValidating(false)
    }
  }

  const saveScenario = async () => {
    if (draft.steps.length === 0) {
      toast('Добавьте хотя бы один шаг', 'error')
      return
    }
    const storageId = selectedId ?? draft.id
    setSaving(true)
    try {
      await validateDraftYaml(false)
      await api.putScenario(storageSerial, storageId, {
        scenario_yaml: buildYamlFromDraft(yamlSerial, { ...draft, id: storageId }),
        variables_yaml: variablesYAML,
      })
      setSelectedId(storageId)
      setDraft((prev) => ({ ...prev, id: storageId }))
      toast(sharedMode ? 'Общий сценарий сохранён' : 'Сценарий сохранён', 'success')
      await refetchList()
      if (!sharedMode && !activeScenarioId) {
        await setActiveScenario(storageId)
      }
      qc.invalidateQueries({ queryKey: ['scenarios', storageSerial] })
      if (!sharedMode) {
        qc.invalidateQueries({ queryKey: ['scenario-status', storageSerial, storageId] })
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteScenario = async (id: string) => {
    const ok = await confirm({
      title: 'Удалить сценарий?',
      message: `Сценарий «${id}» будет удалён без возможности восстановления.`,
      confirmLabel: 'Удалить',
      cancelLabel: 'Отмена',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.deleteScenario(storageSerial, id)
      toast('Удалено', 'success')
      if (selectedId === id) {
        setSelectedId(null)
        setDraft(emptyDraft(yamlSerial))
      }
      refetchList()
      qc.invalidateQueries({ queryKey: ['scenarios', storageSerial] })
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const toggleRunSelection = (id: string) => {
    setSelectedForRun((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runScenariosNow = async () => {
    if (selectedForRun.size === 0) return
    const ids = [...selectedForRun]
    setRunningNow(true)
    try {
      const res = await api.runScenariosNow(storageSerial, ids)
      const summary = res.results
        .map((r) => `${r.scenario_id}: ${r.status}${r.steps_run?.length ? ` (${r.steps_run.join(' → ')})` : ''}`)
        .join('; ')
      const hasFailed = res.results.some((r) => r.status === 'failed')
      toast(summary || 'Запуск завершён', hasFailed ? 'error' : 'success')
      await refetchList()
      for (const id of ids) {
        qc.invalidateQueries({ queryKey: ['scenario-status', storageSerial, id] })
        if (selectedId === id) refetchLogs()
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setRunningNow(false)
    }
  }

  const runStepByIndex = async (index: number) => {
    const scenarioId = selectedId ?? draft.id
    const stepId = stepIdAt(draft, index)
    const yaml = buildYamlFromDraft(yamlSerial, draft)
    const blocks = yaml.split(/\n\s*-\s+id:/).slice(1)
    const block = blocks[index]
    if (!block) return
    const action = block.match(/action:\s*(\S+)/)?.[1]
    if (!action) return

    setRunningStep(stepId)
    try {
      await api.runScenarioStep(storageSerial, {
        scenario_id: scenarioId,
        step_id: stepId,
        action,
        scenario_yaml: yaml,
        variables_yaml: variablesYAML,
      })
      toast(`Шаг ${stepId} запущен`, 'success')
      refetchLogs()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setRunningStep(null)
    }
  }

  const applyScenarioTo = async (targets: string[], scenarioId?: string) => {
    const id = scenarioId ?? selectedId ?? draft.id
    if (!id) {
      toast('Выберите или сохраните сценарий', 'error')
      return
    }
    if (targets.length === 0) {
      toast('Нет телефонов для установки', 'error')
      return
    }
    setApplying(true)
    try {
      const result = await applySharedScenarioToPhones(
        id,
        targets,
        (scenarioId) => api.getScenario(storageSerial, scenarioId),
        (s, scenarioId, files) => api.putScenario(s, scenarioId, files),
        (s, scenarioId) => api.setActiveScenario(s, scenarioId),
      )
      for (const s of result.ok) {
        qc.invalidateQueries({ queryKey: ['scenarios', s] })
      }
      if (result.failed.length === 0) {
        toast(`Установлено на ${result.ok.length} телефонов`, 'success')
      } else {
        toast(
          `Установлено: ${result.ok.length}, ошибок: ${result.failed.length}`,
          result.ok.length > 0 ? 'success' : 'error',
        )
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setApplying(false)
    }
  }

  const title = sharedMode ? 'Общие сценарии' : (phoneLabel ?? serial)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-modal-title"
        className="relative z-10 flex w-full max-w-lg max-h-[92vh] flex-col rounded-xl border border-border bg-surface-2 shadow-2xl"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0 flex-1">
            <h2 id="scenario-modal-title" className="text-sm font-semibold text-slate-100">
              {sharedMode ? 'Общие сценарии' : 'Сценарий'}
            </h2>
            <p className="text-[11px] font-mono text-muted truncate">
              {sharedMode ? 'Шаблоны для нескольких телефонов' : title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface-3 hover:text-slate-200"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-300">
              {items.length} сохранённых
              {!sharedMode && activeScenarioId && (
                <span className="text-green-400/90 ml-1">· {activeScenarioId}</span>
              )}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={newScenario}
                className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" />
                Новый
              </button>
              <button
                type="button"
                onClick={() => refetchList()}
                className="text-[11px] text-accent hover:underline flex items-center gap-0.5"
              >
                <RefreshCw className={`h-3 w-3 ${listLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {sharedMode && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-2 space-y-1.5">
              <p className="text-[11px] text-muted">
                Скопировать шаблон на телефоны и сделать активным для планировщика
              </p>
              <div className="flex flex-wrap gap-1">
                <ActionButton
                  variant="primary"
                  className="text-[11px] py-1 px-2"
                  icon={<Download className="h-3 w-3" />}
                  loading={applying}
                  disabled={applyToSerials.length === 0}
                  onClick={() => applyScenarioTo(applyToSerials)}
                >
                  На выбранные ({applyToSerials.length})
                </ActionButton>
                {allFarmSerials.length > 0 && (
                  <ActionButton
                    variant="secondary"
                    className="text-[11px] py-1 px-2"
                    loading={applying}
                    onClick={() => applyScenarioTo(allFarmSerials)}
                  >
                    На все ({allFarmSerials.length})
                  </ActionButton>
                )}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <ul className="space-y-1 max-h-24 overflow-y-auto">
              {items.map((s: ScenarioSummary) => (
                <li key={s.id}>
                  <div
                    className={`flex items-stretch gap-1 rounded-lg border px-1 ${
                      selectedId === s.id ? 'border-accent/50 bg-accent/10' : 'border-border bg-surface-3'
                    }`}
                  >
                    {!sharedMode && (
                      <input
                        type="checkbox"
                        checked={selectedForRun.has(s.id)}
                        onChange={() => toggleRunSelection(s.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 shrink-0 rounded border-border scale-90"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => loadScenario(s.id)}
                      className="flex-1 min-w-0 text-left py-1 px-1"
                    >
                      <div className="flex items-center gap-1 text-xs">
                        {!sharedMode && s.is_active && (
                          <Star className="h-3 w-3 fill-green-400 text-green-400" />
                        )}
                        <span className="font-medium truncate">{s.name || s.id}</span>
                      </div>
                    </button>
                    {!sharedMode && !s.is_active && (
                      <button
                        type="button"
                        title="Активировать"
                        onClick={() => setActiveScenario(s.id)}
                        className="p-1 text-muted hover:text-green-400"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    )}
                    {sharedMode && (
                      <button
                        type="button"
                        title="Установить на выбранные"
                        disabled={applyToSerials.length === 0 || applying}
                        onClick={() => applyScenarioTo(applyToSerials, s.id)}
                        className="p-1 text-muted hover:text-accent disabled:opacity-40"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Удалить"
                      onClick={() => deleteScenario(s.id)}
                      className="p-1 text-muted hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-lg border border-border bg-surface-3 p-2 space-y-2">
            <label className="block text-xs">
              <span className="text-muted">Название</span>
              <input
                value={draft.name}
                onChange={(e) => patchDraft({ name: e.target.value })}
                className="mt-0.5 w-full rounded border border-border bg-surface-2 px-2 py-1 text-sm"
              />
            </label>

            <label className="block text-xs">
              <span className="text-muted flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Время начала (первый шаг)
              </span>
              <input
                type="time"
                value={draft.startAt}
                onChange={(e) => patchDraft({ startAt: e.target.value })}
                className="mt-0.5 w-full rounded border border-border bg-surface-2 px-2 py-1 text-sm"
              />
            </label>

            <div className="text-xs">
              <span className="text-muted">Приложение</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {NETWORKS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => patchDraft({ network: n.id })}
                    className={`rounded border px-2 py-0.5 text-[11px] ${
                      draft.network === n.id
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border text-slate-300'
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-300">Шаги</div>
            {draft.steps.length === 0 && (
              <p className="text-[11px] text-muted py-1">Нет шагов — добавьте первый ниже</p>
            )}
            {draft.steps.map((step, index) => (
              <div
                key={step.uid}
                className="rounded-lg border border-border bg-surface-3 px-2 py-1.5 space-y-1.5"
              >
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted w-4">{index + 1}.</span>
                  <span className="text-xs font-medium text-slate-200 flex-1">
                    {stepTypeTitle(step.type)}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveStep(step.uid, -1)}
                    disabled={index === 0}
                    className="p-0.5 text-muted hover:text-slate-300 disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(step.uid, 1)}
                    disabled={index === draft.steps.length - 1}
                    className="p-0.5 text-muted hover:text-slate-300 disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(step.uid)}
                    className="p-0.5 text-muted hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {step.type === 'scroll_feed' && (
                  <label className="flex items-center gap-2 text-xs">
                    <span className="text-muted">Секунд</span>
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={step.durationSec}
                      onChange={(e) => patchStep(step.uid, { durationSec: Number(e.target.value) })}
                      className="w-20 rounded border border-border bg-surface-2 px-1.5 py-0.5"
                    />
                  </label>
                )}

                {step.type === 'search_feed' && (
                  <div className="flex gap-1.5">
                    <input
                      value={step.query}
                      onChange={(e) => patchStep(step.uid, { query: e.target.value })}
                      placeholder="Поисковый запрос"
                      className="flex-1 min-w-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-xs"
                    />
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={step.count}
                      onChange={(e) => patchStep(step.uid, { count: Number(e.target.value) })}
                      title="Роликов"
                      className="w-12 rounded border border-border bg-surface-2 px-1 py-0.5 text-xs"
                    />
                  </div>
                )}

                {step.type === 'wait' && (
                  <label className="flex items-center gap-2 text-xs">
                    <span className="text-muted">Секунд</span>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={step.waitSec}
                      onChange={(e) => patchStep(step.uid, { waitSec: Number(e.target.value) })}
                      className="w-20 rounded border border-border bg-surface-2 px-1.5 py-0.5"
                    />
                  </label>
                )}

                {!sharedMode && selectedId && (
                  <ActionButton
                    variant="ghost"
                    className="text-[10px] py-0 px-1 h-6"
                    icon={<Play className="h-2.5 w-2.5" />}
                    loading={runningStep === stepIdAt(draft, index)}
                    onClick={() => runStepByIndex(index)}
                  >
                    Запустить шаг
                  </ActionButton>
                )}
              </div>
            ))}

            <div className="flex gap-1.5">
              <select
                value={addStepType}
                onChange={(e) => {
                  const v = e.target.value as BuilderStepType | ''
                  if (v) addStep(v)
                }}
                className="flex-1 rounded-lg border border-border bg-surface-3 px-2 py-1.5 text-xs text-slate-300"
              >
                <option value="">+ Добавить шаг…</option>
                {STEP_TYPE_CATALOG.map((s) => (
                  <option key={s.type} value={s.type}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            <ActionButton
              variant="primary"
              className="text-[11px] py-1 px-2"
              icon={<Save className="h-3 w-3" />}
              loading={saving}
              onClick={saveScenario}
            >
              Сохранить
            </ActionButton>
            <ActionButton
              variant="secondary"
              className="text-[11px] py-1 px-2"
              icon={<Wand2 className="h-3 w-3" />}
              loading={validating}
              onClick={() => validateDraftYaml(true)}
            >
              Проверить
            </ActionButton>
            {!sharedMode && items.length > 0 && (
              <ActionButton
                variant="secondary"
                className="text-[11px] py-1 px-2"
                icon={<Zap className="h-3 w-3" />}
                loading={runningNow}
                disabled={selectedForRun.size === 0}
                onClick={runScenariosNow}
              >
                Run ({selectedForRun.size})
              </ActionButton>
            )}
          </div>

          {(isValid !== null || stepIssues.length > 0 || genWarnings.length > 0) && (
            <div className="rounded-lg border border-border bg-surface-3 px-2 py-1.5 text-[10px] space-y-1">
              <div className="flex items-center gap-1 font-medium text-slate-300">
                {isValid ? (
                  <CheckCircle2 className="h-3 w-3 text-green-400" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                )}
                {isValid !== null && (isValid ? 'Валиден' : 'Есть ошибки')}
                {runnable !== null && ` · планировщик: ${runnable ? 'да' : 'нет'}`}
              </div>
              {stepIssues.map((iss) => (
                <div key={`${iss.step_id}-${iss.message}`} className={issueColor(iss.level)}>
                  {iss.step_id}: {iss.message}
                </div>
              ))}
            </div>
          )}

          {!sharedMode && selectedId && statusData && (
            <div className="rounded-lg border border-border bg-surface-3 px-2 py-1.5 text-[10px]">
              Планировщик: {selectedId === activeScenarioId ? 'активный' : 'не активный'}
              {' · '}
              В сроках: {statusData.active ? 'да' : 'нет'}
            </div>
          )}

          <CollapsibleSection title="YAML (для отладки)" open={showYaml} onToggle={() => setShowYaml((v) => !v)}>
            <pre className="rounded border border-border bg-surface-2 p-2 text-[10px] font-mono max-h-40 overflow-auto whitespace-pre-wrap">
              {scenarioYAML}
            </pre>
          </CollapsibleSection>

          {!sharedMode && selectedId && (
            <CollapsibleSection title="Логи" open={showLogs} onToggle={() => setShowLogs((v) => !v)}>
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="text-[10px] rounded border border-border bg-surface-2 px-1.5 py-0.5"
                />
                <button
                  type="button"
                  onClick={() => refetchLogs()}
                  className="text-[10px] text-accent hover:underline"
                >
                  обновить
                </button>
              </div>
              <pre className="rounded border border-border bg-surface-2 p-2 text-[10px] font-mono max-h-32 overflow-auto whitespace-pre-wrap">
                {logsData?.logs || '(пусто)'}
              </pre>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  )
}
