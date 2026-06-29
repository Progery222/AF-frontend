import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { SelectionBanner } from '@/components/SelectionBanner'
import { useBulkAction } from '@/hooks/useBulkAction'
import { useToast } from '@/components/Toast'
import { ActionButton } from '@/components/ActionButton'
import { Save, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import type { ScenarioSummary } from '@/types'

const EMPTY_SCENARIO = `id: new-scenario
name: "Новый сценарий"
serial: ""
timezone: "Europe/Moscow"
valid_from: "2026-06-29T00:00:00+03:00"
valid_until: "2026-12-31T23:59:59+03:00"
schedule:
  type: daily_recurring
steps: []
`

const EMPTY_VARIABLES = `# variables.yaml
warmup_feed:
  scroll_interval_sec: [3, 12]
`

export function ScenariosPage() {
  const { hasSelection, label, isMulti, singleSerial, isSingle } = useBulkAction()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scenarioYAML, setScenarioYAML] = useState(EMPTY_SCENARIO)
  const [variablesYAML, setVariablesYAML] = useState(EMPTY_VARIABLES)
  const [aiPrompt, setAiPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))

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

  useEffect(() => {
    if (!singleSerial) return
    setScenarioYAML((prev) =>
      prev.includes(`serial: "${singleSerial}"`) || prev.includes(`serial: ${singleSerial}`)
        ? prev
        : prev.replace(/serial:\s*"?[^"\n]*"?/, `serial: "${singleSerial}"`),
    )
  }, [singleSerial])

  const loadScenario = async (id: string) => {
    if (!singleSerial) return
    try {
      const files = await api.getScenario(singleSerial, id)
      setSelectedId(id)
      setScenarioYAML(files.scenario_yaml)
      setVariablesYAML(files.variables_yaml || EMPTY_VARIABLES)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const saveScenario = async () => {
    if (!singleSerial) return
    const idMatch = scenarioYAML.match(/^id:\s*(\S+)/m)
    const id = idMatch?.[1] ?? selectedId ?? 'new-scenario'
    setSaving(true)
    try {
      await api.putScenario(singleSerial, id, {
        scenario_yaml: scenarioYAML,
        variables_yaml: variablesYAML,
      })
      setSelectedId(id)
      toast('Сценарий сохранён', 'success')
      await refetchList()
      qc.invalidateQueries({ queryKey: ['scenario-status', singleSerial, id] })
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteScenario = async (id: string) => {
    if (!singleSerial || !confirm(`Удалить сценарий ${id}?`)) return
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

  const generateAI = async () => {
    if (!singleSerial || !aiPrompt.trim()) return
    setGenerating(true)
    try {
      const res = await api.generateScenario(singleSerial, aiPrompt.trim())
      setScenarioYAML(res.scenario_yaml)
      setVariablesYAML(res.variables_yaml || EMPTY_VARIABLES)
      if (res.warnings?.length) {
        toast(res.warnings.join('; '), 'error')
      } else {
        toast('Черновик сгенерирован', 'success')
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setGenerating(false)
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
        description="Просмотр и редактирование YAML-сценариев (MinIO через orchestrator)"
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">Список</h2>
            <button
              type="button"
              onClick={() => refetchList()}
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${listLoading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {items.length === 0 && (
              <li className="text-xs text-muted p-2">Нет сценариев — создайте и сохраните</li>
            )}
            {items.map((s: ScenarioSummary) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => loadScenario(s.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm border ${
                    selectedId === s.id
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-border bg-surface-3 hover:bg-border'
                  }`}
                >
                  <div className="font-medium">{s.name || s.id}</div>
                  <div className="text-xs text-muted truncate">{s.id}</div>
                </button>
              </li>
            ))}
          </ul>

          {selectedId && statusData && (
            <div className="rounded-lg border border-border bg-surface-3 p-3 text-xs space-y-1">
              <div className="font-medium text-slate-300">Статус</div>
              <div>Активен: {statusData.active ? 'да' : 'нет'}</div>
              {statusData.current_step && <div>Текущий шаг: {statusData.current_step}</div>}
              {statusData.next_step && <div>Следующий: {statusData.next_step}</div>}
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface-3 p-3 space-y-2">
            <div className="text-xs font-medium text-slate-300">ИИ-генерация</div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              placeholder="Опишите сценарий..."
              className="w-full rounded border border-border bg-surface-2 px-2 py-1 text-xs font-mono"
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
          </div>
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

          <div>
            <label className="text-xs text-muted block mb-1">scenario.yaml</label>
            <textarea
              value={scenarioYAML}
              onChange={(e) => setScenarioYAML(e.target.value)}
              rows={18}
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-mono leading-relaxed"
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1">variables.yaml</label>
            <textarea
              value={variablesYAML}
              onChange={(e) => setVariablesYAML(e.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-mono leading-relaxed"
            />
          </div>

          {selectedId && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs text-muted">Логи</label>
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
