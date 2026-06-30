import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { SelectionBanner } from '@/components/SelectionBanner'
import { useBulkAction } from '@/hooks/useBulkAction'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { ActionButton } from '@/components/ActionButton'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Play, Plus, Save, RefreshCw, Sparkles, Star, Trash2, Wand2 } from 'lucide-react'
import type { ScenarioStepIssue, ScenarioSummary } from '@/types'

const EMPTY_SCENARIO = `id: new-scenario
name: "Новый сценарий"
serial: ""
timezone: "Europe/Moscow"
valid_from: "2026-06-29T00:00:00+03:00"
valid_until: "2026-12-31T23:59:59+03:00"
schedule:
  type: daily_recurring
  execution: sequential
steps: []
`

const EMPTY_VARIABLES = `warmup_profiles:
  tiktok_daily:
    pre_publish:
      duration_sec: [55, 65]
      likes_max: [0, 0]
      saves: forbidden
warmup_feed:
  scroll_interval_sec: [3, 12]
  view_duration_sec: [5, 12]
  like_probability: [0, 0]
  swipe_pause_ms: [300, 800]
`

const TIKTOK_PACKAGES = ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill']

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  className = '',
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-lg border border-border bg-surface-3 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-surface-2 rounded-lg"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        {title}
      </button>
      {open && <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">{children}</div>}
    </div>
  )
}

function parseStepsFromYAML(yaml: string): { id: string; action: string }[] {
  const blocks = yaml.split(/\n\s*-\s+id:/)
  if (blocks.length <= 1) return []
  return blocks.slice(1).map((block) => {
    const id = block.match(/^\s*(\S+)/)?.[1] ?? ''
    const action = block.match(/action:\s*(\S+)/)?.[1] ?? ''
    return { id, action }
  }).filter((s) => s.id)
}

function issueColor(level: string) {
  return level === 'error' ? 'text-red-400' : 'text-amber-400'
}

export function ScenariosPage() {
  const { hasSelection, label, isMulti, singleSerial, isSingle } = useBulkAction()
  const { toast } = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scenarioYAML, setScenarioYAML] = useState(EMPTY_SCENARIO)
  const [variablesYAML, setVariablesYAML] = useState(EMPTY_VARIABLES)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [showScenarioYaml, setShowScenarioYaml] = useState(false)
  const [showVariablesYaml, setShowVariablesYaml] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const autoLoadedFor = useRef<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [validating, setValidating] = useState(false)
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [stepIssues, setStepIssues] = useState<ScenarioStepIssue[]>([])
  const [genWarnings, setGenWarnings] = useState<string[]>([])
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [runnable, setRunnable] = useState<boolean | null>(null)

  const parsedSteps = useMemo(() => parseStepsFromYAML(scenarioYAML), [scenarioYAML])

  const { data: listData, refetch: refetchList, isFetching: listLoading } = useQuery({
    queryKey: ['scenarios', singleSerial],
    queryFn: () => api.listScenarios(singleSerial!),
    enabled: isSingle && !!singleSerial,
  })

  const { data: statusData } = useQuery({
    queryKey: ['scenario-status', singleSerial, selectedId],
    queryFn: () => api.getScenarioStatus(singleSerial!, selectedId!),
    enabled: isSingle && !!singleSerial && !!selectedId,
    refetchInterval: 30_000,
  })

  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['scenario-logs', singleSerial, selectedId, logDate],
    queryFn: () => api.getScenarioLogs(singleSerial!, selectedId!, logDate),
    enabled: isSingle && !!singleSerial && !!selectedId,
  })

  const items = listData?.items ?? []
  const activeScenarioId = listData?.active_scenario_id ?? items.find((s) => s.is_active)?.id ?? null

  useEffect(() => {
    autoLoadedFor.current = null
  }, [singleSerial])

  const loadScenario = async (id: string) => {
    if (!singleSerial) return
    try {
      const files = await api.getScenario(singleSerial, id)
      setSelectedId(id)
      setScenarioYAML(files.scenario_yaml)
      setVariablesYAML(files.variables_yaml || EMPTY_VARIABLES)
      setStepIssues([])
      setGenWarnings([])
      setIsValid(null)
      setRunnable(null)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  useEffect(() => {
    if (!singleSerial || !listData || autoLoadedFor.current === singleSerial) return
    const id = activeScenarioId ?? items[0]?.id
    if (!id) return
    autoLoadedFor.current = singleSerial
    void loadScenario(id)
  }, [singleSerial, listData, activeScenarioId, items])

  const newScenario = () => {
    if (!singleSerial) return
    const stamp = Date.now().toString(36)
    const id = `scenario-${stamp}`
    setSelectedId(null)
    setScenarioYAML(`id: ${id}
name: "Новый сценарий"
serial: "${singleSerial}"
timezone: "Europe/Moscow"
valid_from: "${new Date().toISOString().slice(0, 10)}T00:00:00+03:00"
valid_until: "${new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10)}T23:59:59+03:00"
schedule:
  type: daily_recurring
  execution: sequential
steps: []
`)
    setVariablesYAML(EMPTY_VARIABLES)
    setStepIssues([])
    setGenWarnings([])
    setIsValid(null)
    setRunnable(null)
    setShowScenarioYaml(true)
  }

  const setActiveScenario = async (id: string) => {
    if (!singleSerial) return
    try {
      await api.setActiveScenario(singleSerial, id)
      toast(`Активный сценарий: ${id}`, 'success')
      await refetchList()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  useEffect(() => {
    if (!singleSerial) return
    setScenarioYAML((prev) =>
      prev.includes(`serial: "${singleSerial}"`) || prev.includes(`serial: ${singleSerial}`)
        ? prev
        : prev.replace(/serial:\s*"?[^"\n]*"?/, `serial: "${singleSerial}"`),
    )
  }, [singleSerial])

  const saveScenario = async () => {
    if (!singleSerial) return
    const yamlId = scenarioYAML.match(/^id:\s*(\S+)/m)?.[1]
    const storageId = selectedId ?? yamlId ?? 'new-scenario'
    setSaving(true)
    try {
      await validateDraft(false)
      await api.putScenario(singleSerial, storageId, {
        scenario_yaml: scenarioYAML,
        variables_yaml: variablesYAML,
      })
      setSelectedId(storageId)
      toast('Сценарий сохранён', 'success')
      await refetchList()
      if (!activeScenarioId) {
        await setActiveScenario(storageId)
      }
      qc.invalidateQueries({ queryKey: ['scenario-status', singleSerial, storageId] })
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteScenario = async (id: string) => {
    if (!singleSerial) return
    const ok = await confirm({
      title: 'Удалить сценарий?',
      message: `Сценарий «${id}» будет удалён без возможности восстановления.`,
      confirmLabel: 'Удалить',
      cancelLabel: 'Отмена',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.deleteScenario(singleSerial, id)
      toast('Удалено', 'success')
      if (selectedId === id) {
        setSelectedId(null)
        setScenarioYAML(EMPTY_SCENARIO)
        setVariablesYAML(EMPTY_VARIABLES)
      }
      refetchList()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const validateDraft = async (applyNormalized = true) => {
    if (!singleSerial) return
    setValidating(true)
    try {
      const res = await api.validateScenario(singleSerial, scenarioYAML, variablesYAML, true)
      setStepIssues(res.step_issues ?? [])
      setGenWarnings(res.warnings ?? [])
      setIsValid(res.valid)
      setRunnable(res.runnable_by_scheduler ?? null)
      if (applyNormalized && res.normalized_scenario_yaml) {
        setScenarioYAML(res.normalized_scenario_yaml)
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

  const generateAI = async () => {
    if (!singleSerial || !aiPrompt.trim()) return
    setGenerating(true)
    try {
      const res = await api.generateScenario(singleSerial, aiPrompt.trim())
      const yaml = res.normalized_scenario_yaml?.trim() || res.scenario_yaml
      setScenarioYAML(yaml)
      setVariablesYAML(res.variables_yaml?.trim() || EMPTY_VARIABLES)
      setStepIssues(res.step_issues ?? [])
      setGenWarnings(res.warnings ?? [])
      setIsValid(res.valid ?? null)
      setRunnable(res.runnable_by_scheduler ?? null)
      if (res.valid === false) {
        toast(`Ошибки: ${(res.errors ?? []).join('; ') || 'см. step_issues'}`, 'error')
      } else if ((res.warnings ?? []).length > 0) {
        toast(`Сгенерировано и нормализовано (${res.warnings!.length} предупреждений)`, 'success')
      } else {
        toast('Черновик сгенерирован, проверен и нормализован', 'success')
      }
      setShowScenarioYaml(true)
      if (res.variables_yaml?.trim()) setShowVariablesYaml(true)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const insertTikTokPackage = () => {
    const pkg = TIKTOK_PACKAGES.find((p) => !scenarioYAML.includes(p)) ?? TIKTOK_PACKAGES[0]
    if (scenarioYAML.includes(pkg)) {
      toast(`Пакет ${pkg} уже в YAML`, 'success')
      return
    }
    setScenarioYAML((prev) =>
      prev.replace(/package:\s*\S+/g, `package: ${pkg}`).includes(pkg)
        ? prev
        : prev.replace(/(open_app[\s\S]*?params:\s*\n)/, `$1      package: ${pkg}\n`),
    )
    toast(`Подставлен TikTok: ${pkg}`, 'success')
  }

  const runStep = async (stepId: string, action: string) => {
    if (!singleSerial) return
    const scenarioId = selectedId ?? scenarioYAML.match(/^id:\s*(\S+)/m)?.[1]
    if (!scenarioId) {
      toast('Сначала укажите id сценария', 'error')
      return
    }
    setRunningStep(stepId)
    try {
      await api.runScenarioStep(singleSerial, {
        scenario_id: scenarioId,
        step_id: stepId,
        action,
        scenario_yaml: scenarioYAML,
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

  if (!hasSelection) return <NoPhoneSelected />
  if (!isSingle) {
    return (
      <div>
        <PageHeader title="Сценарии" description="Редактирование доступно для одного телефона" />
        <SelectionBanner label={label} isMulti={isMulti} count={1} />
        <p className="text-sm text-muted">Выберите один телефон для просмотра и редактирования сценариев.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Сценарии"
        description="YAML-сценарии с валидацией, social_action и ручным запуском шагов"
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-300">Сценарии ({items.length})</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={newScenario}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Новый
              </button>
              <button
                type="button"
                onClick={() => refetchList()}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${listLoading ? 'animate-spin' : ''}`} />
                Обновить
              </button>
            </div>
          </div>
          {activeScenarioId && (
            <p className="text-xs text-green-400/90">
              Планировщик: <span className="font-mono">{activeScenarioId}</span>
            </p>
          )}
          {!activeScenarioId && items.length > 0 && (
            <p className="text-xs text-amber-400/90">Выберите активный сценарий для планировщика</p>
          )}
          <ul className="space-y-1 max-h-72 overflow-y-auto">
            {items.length === 0 && (
              <li className="text-xs text-muted p-2">Нет сценариев — нажмите «Новый» и сохраните</li>
            )}
            {items.map((s: ScenarioSummary) => (
              <li key={s.id} className="group">
                <div
                  className={`flex items-stretch gap-1 rounded-lg border ${
                    selectedId === s.id
                      ? 'border-accent/50 bg-accent/10'
                      : 'border-border bg-surface-3 hover:bg-border'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => loadScenario(s.id)}
                    className={`flex-1 min-w-0 text-left px-3 py-2 text-sm ${
                      selectedId === s.id ? 'text-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {s.is_active && (
                        <Star className="h-3.5 w-3.5 shrink-0 fill-green-400 text-green-400" />
                      )}
                      <span className="font-medium truncate">{s.name || s.id}</span>
                    </div>
                    <div className="text-xs text-muted truncate">
                      {s.id}
                      {s.yaml_id && s.yaml_id !== s.id && (
                        <span className="text-amber-400/80"> · yaml: {s.yaml_id}</span>
                      )}
                    </div>
                  </button>
                  <div className="flex flex-col justify-center gap-0.5 pr-1 py-1">
                    {!s.is_active && (
                      <button
                        type="button"
                        title="Сделать активным"
                        onClick={() => setActiveScenario(s.id)}
                        className="rounded p-1 text-muted hover:text-green-400 hover:bg-surface-2"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Удалить"
                      onClick={() => deleteScenario(s.id)}
                      className="rounded p-1 text-muted hover:text-red-400 hover:bg-surface-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {selectedId && statusData && (
            <div className="rounded-lg border border-border bg-surface-3 p-3 text-xs space-y-1">
              <div className="font-medium text-slate-300">Статус</div>
              <div>
                Планировщик: {selectedId === activeScenarioId ? 'активный' : 'не активный'}
              </div>
              <div>В сроках: {statusData.active ? 'да' : 'нет'}</div>
              {statusData.current_step && <div>Текущий шаг: {statusData.current_step}</div>}
              {statusData.next_step && <div>Следующий: {statusData.next_step}</div>}
            </div>
          )}

          {(isValid !== null || stepIssues.length > 0 || genWarnings.length > 0) && (
            <div className="rounded-lg border border-border bg-surface-3 p-3 text-xs space-y-2">
              <div className="font-medium text-slate-300 flex items-center gap-1">
                {isValid ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                )}
                Проверка DSL
              </div>
              {isValid !== null && <div>Валиден: {isValid ? 'да' : 'нет'}</div>}
              {runnable !== null && <div>Планировщик: {runnable ? 'запустит' : 'не запустит'}</div>}
              {genWarnings.map((w) => (
                <div key={w} className="text-amber-400/90">
                  {w}
                </div>
              ))}
              {stepIssues.map((iss) => (
                <div key={`${iss.step_id}-${iss.message}`} className={issueColor(iss.level)}>
                  {iss.step_id}: {iss.message}
                </div>
              ))}
            </div>
          )}

          {parsedSteps.length > 0 && (
            <div className="rounded-lg border border-border bg-surface-3 p-3 space-y-2">
              <div className="text-xs font-medium text-slate-300">Запуск шагов</div>
              {parsedSteps.map((st) => (
                <ActionButton
                  key={st.id}
                  variant="secondary"
                  className="w-full text-xs justify-start"
                  icon={<Play className="h-3.5 w-3.5" />}
                  loading={runningStep === st.id}
                  onClick={() => runStep(st.id, st.action)}
                >
                  {st.id} ({st.action})
                </ActionButton>
              ))}
            </div>
          )}

          <CollapsibleSection
            title="ИИ-генерация"
            open={showAiPanel}
            onToggle={() => setShowAiPanel((v) => !v)}
          >
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={12}
              placeholder="Опишите сценарий: время старта, шаги, пакет приложения..."
              className="w-full min-h-[220px] resize-y rounded border border-border bg-surface-2 px-2 py-2 text-xs font-mono leading-relaxed"
            />
            <ActionButton
              variant="secondary"
              className="w-full text-xs"
              icon={<Sparkles className="h-4 w-4" />}
              loading={generating}
              onClick={generateAI}
            >
              Сгенерировать черновик
            </ActionButton>
          </CollapsibleSection>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap gap-2">
            <ActionButton
              variant="primary"
              icon={<Save className="h-4 w-4" />}
              loading={saving}
              onClick={saveScenario}
            >
              Сохранить
            </ActionButton>
            <ActionButton
              variant="secondary"
              icon={<Wand2 className="h-4 w-4" />}
              loading={validating}
              onClick={() => validateDraft(true)}
            >
              Проверить / нормализовать
            </ActionButton>
            <ActionButton variant="secondary" className="text-xs" onClick={insertTikTokPackage}>
              TikTok package
            </ActionButton>
            {selectedId && (
              <ActionButton
                variant="secondary"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => deleteScenario(selectedId)}
              >
                Удалить
              </ActionButton>
            )}
          </div>

          <CollapsibleSection
            title="scenario.yaml"
            open={showScenarioYaml}
            onToggle={() => setShowScenarioYaml((v) => !v)}
          >
            <textarea
              value={scenarioYAML}
              onChange={(e) => setScenarioYAML(e.target.value)}
              rows={18}
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-mono leading-relaxed"
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="variables.yaml"
            open={showVariablesYaml}
            onToggle={() => setShowVariablesYaml((v) => !v)}
          >
            <textarea
              value={variablesYAML}
              onChange={(e) => setVariablesYAML(e.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-mono leading-relaxed"
            />
          </CollapsibleSection>

          {selectedId && (
            <CollapsibleSection title="Логи" open={showLogs} onToggle={() => setShowLogs((v) => !v)}>
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="text-xs rounded border border-border bg-surface-2 px-2 py-0.5"
                />
                <button
                  type="button"
                  onClick={() => refetchLogs()}
                  className="text-xs text-accent hover:underline"
                >
                  обновить
                </button>
              </div>
              <pre className="rounded-lg border border-border bg-surface-2 p-3 text-xs font-mono max-h-48 overflow-auto whitespace-pre-wrap">
                {logsData?.logs || '(пусто)'}
              </pre>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  )
}
