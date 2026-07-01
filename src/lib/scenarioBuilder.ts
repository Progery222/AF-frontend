import type { SocialNetwork } from '@/api/behavior'
import { DEFAULT_TAP_REF, REF_SCREEN } from '@/lib/feedGestures'
import { TIKTOK_PACKAGES } from '@/pages/scenarios/shared'

export type BuilderStepType =
  | 'open_app'
  | 'scroll_feed'
  | 'search_feed'
  | 'wait'
  | 'close_app'
  | 'ctrl_home'
  | 'ctrl_back'
  | 'ctrl_recents'
  | 'ctrl_power'
  | 'ctrl_swipe_up'
  | 'ctrl_swipe_down'
  | 'ctrl_swipe_left'
  | 'ctrl_swipe_right'
  | 'ctrl_tap_center'
  | 'ctrl_tap_custom'

export function isControlStepType(type: BuilderStepType): boolean {
  return type.startsWith('ctrl_')
}

function controlKindFromType(type: BuilderStepType): string {
  return type.slice(5)
}

export interface BuilderStep {
  uid: string
  type: BuilderStepType
  /** Только для open_app — какое приложение запускать */
  network: SocialNetwork
  durationSec: number
  query: string
  count: number
  waitSec: number
  /** Эталон 1080×1920 — для ctrl_tap_custom */
  tapRefX: number
  tapRefY: number
}

export interface ScenarioDraft {
  id: string
  name: string
  startAt: string
  steps: BuilderStep[]
}

export interface StepTypeDef {
  type: BuilderStepType
  title: string
  description: string
}

export const STEP_TYPE_CATALOG: StepTypeDef[] = [
  { type: 'open_app', title: 'Открыть приложение', description: 'Запуск TikTok / Instagram / YouTube' },
  { type: 'scroll_feed', title: 'Скролл ленты', description: 'Прогрев ленты, длительность в секундах' },
  { type: 'search_feed', title: 'Поиск', description: 'Поисковый запрос и открытие первого результата' },
  { type: 'wait', title: 'Пауза', description: 'Ожидание между шагами' },
  { type: 'close_app', title: 'Закрыть приложение', description: 'Выход из приложения' },
]

export const CONTROL_STEP_CATALOG: StepTypeDef[] = [
  { type: 'ctrl_home', title: 'Домой', description: 'Системная кнопка Home' },
  { type: 'ctrl_back', title: 'Назад', description: 'Системная кнопка Back' },
  { type: 'ctrl_recents', title: 'Последние', description: 'Список недавних приложений' },
  { type: 'ctrl_power', title: 'Power', description: 'Кнопка питания' },
  { type: 'ctrl_swipe_up', title: 'Следующий пост', description: 'Свайп вверх (как в ленте)' },
  { type: 'ctrl_swipe_down', title: 'Предыдущий пост', description: 'Свайп вниз' },
  { type: 'ctrl_tap_center', title: 'Тап центр', description: 'Тап по центру экрана' },
  { type: 'ctrl_swipe_left', title: 'Свайп влево', description: 'Горизонтальный свайп влево' },
  { type: 'ctrl_swipe_right', title: 'Свайп вправо', description: 'Горизонтальный свайп вправо' },
  { type: 'ctrl_tap_custom', title: 'Тап по координатам', description: `Координаты эталона ${REF_SCREEN.width}×${REF_SCREEN.height}` },
]

export function stepTypeTitle(type: BuilderStepType): string {
  return (
    STEP_TYPE_CATALOG.find((s) => s.type === type)?.title ??
    CONTROL_STEP_CATALOG.find((s) => s.type === type)?.title ??
    type
  )
}

export function newStepUid(): string {
  return `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function createStep(type: BuilderStepType): BuilderStep {
  return {
    uid: newStepUid(),
    type,
    network: 'tiktok',
    durationSec: 60,
    query: '',
    count: 5,
    waitSec: 4,
    tapRefX: DEFAULT_TAP_REF.x,
    tapRefY: DEFAULT_TAP_REF.y,
  }
}

export function stepActionForRun(type: BuilderStepType): string {
  if (isControlStepType(type)) return 'device_control'
  const map: Record<string, string> = {
    open_app: 'open_app',
    scroll_feed: 'warmup_feed',
    search_feed: 'social_action',
    wait: 'wait',
    close_app: 'close_app',
  }
  return map[type] ?? type
}

export function networkLabel(network: SocialNetwork): string {
  if (network === 'instagram') return 'Instagram'
  if (network === 'youtube') return 'YouTube'
  return 'TikTok'
}

/** Какое приложение открыто перед шагом (после последнего open_app, до close_app). */
export function activeNetworkBeforeStep(steps: BuilderStep[], stepIndex: number): SocialNetwork | null {
  for (let i = stepIndex - 1; i >= 0; i--) {
    const s = steps[i]
    if (s.type === 'open_app') return s.network
    if (s.type === 'close_app') return null
  }
  return null
}

export function emptyDraft(_serial: string): ScenarioDraft {
  return {
    id: `scenario-${Date.now().toString(36)}`,
    name: 'Новый сценарий',
    startAt: '10:00',
    steps: [],
  }
}

function networkFromPackage(pkg: string | undefined): SocialNetwork {
  if (!pkg) return 'tiktok'
  if (pkg.includes('instagram')) return 'instagram'
  if (pkg.includes('youtube')) return 'youtube'
  return 'tiktok'
}

function packageForNetwork(network: SocialNetwork): string {
  if (network === 'tiktok') return TIKTOK_PACKAGES[0]
  if (network === 'instagram') return 'com.instagram.android'
  return 'com.google.android.youtube'
}

function defaultStepId(type: BuilderStepType, index: number): string {
  const base = isControlStepType(type) ? type : type
  const ids: Record<string, string> = {
    open_app: 'open_app',
    scroll_feed: 'scroll_feed',
    search_feed: 'search_feed',
    wait: 'wait',
    close_app: 'close_app',
  }
  const id = ids[type] ?? base
  return index > 0 ? `${id}_${index + 1}` : id
}

export function stepIdAt(draft: ScenarioDraft, index: number): string {
  const step = draft.steps[index]
  if (!step) return `step_${index}`
  return defaultStepId(step.type, index)
}

function yamlQuote(value: string): string {
  if (/^[A-Za-z0-9_\-]+$/.test(value)) return value
  return `"${value.replace(/"/g, '\\"')}"`
}

export function buildYamlFromDraft(serial: string, draft: ScenarioDraft): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const validFrom = `${y}-${m}-${d}T00:00:00+03:00`
  const end = new Date(now)
  end.setMonth(end.getMonth() + 1)
  const validUntil = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}T23:59:59+03:00`

  const stepLines: string[] = []
  let openNetwork: SocialNetwork | null = null

  draft.steps.forEach((step, index) => {
    const id = defaultStepId(step.type, index)
    const lines: string[] = [`  - id: ${id}`]
    if (index === 0) {
      lines.push(`    at: "${draft.startAt}"`)
    } else {
      lines.push('    after_previous: true')
    }
    if (step.type === 'close_app') {
      lines.push('    after_failure: true')
    }

    switch (step.type) {
      case 'open_app': {
        openNetwork = step.network
        const pkg = packageForNetwork(step.network)
        lines.push('    action: open_app', '    params:', `      package: ${pkg}`)
        break
      }
      case 'scroll_feed':
        lines.push(
          '    action: warmup_feed',
          '    params:',
          '      profile: tiktok_daily',
          '      phase: pre_publish',
          `      duration_sec: "${step.durationSec}"`,
          '      skip_launch: "true"',
        )
        break
      case 'search_feed': {
        const network = openNetwork ?? activeNetworkBeforeStep(draft.steps, index) ?? 'tiktok'
        lines.push(
          '    action: social_action',
          '    params:',
          `      network: ${network}`,
          '      behavior: search-feed',
          `      query: ${yamlQuote(step.query.trim() || 'Football')}`,
          '      open_first_only: "true"',
          '      skip_launch: "true"',
        )
        break
      }
      case 'wait':
        lines.push('    action: wait', '    params:', `      duration_sec: "${step.waitSec}"`)
        break
      case 'close_app': {
        const network = openNetwork ?? activeNetworkBeforeStep(draft.steps, index) ?? 'tiktok'
        const pkg = packageForNetwork(network)
        lines.push('    action: close_app', '    params:', `      package: ${pkg}`)
        openNetwork = null
        break
      }
      default: {
        if (!isControlStepType(step.type)) break
        const kind = controlKindFromType(step.type)
        const ctrlLines = ['    action: device_control', '    params:', `      kind: ${kind}`]
        if (kind === 'tap_custom') {
          ctrlLines.push(`      ref_x: "${step.tapRefX}"`, `      ref_y: "${step.tapRefY}"`)
        }
        lines.push(...ctrlLines)
        break
      }
    }
    stepLines.push(lines.join('\n'))
  })

  return `id: ${draft.id}
name: ${yamlQuote(draft.name)}
serial: "${serial}"
timezone: "Europe/Moscow"
valid_from: "${validFrom}"
valid_until: "${validUntil}"
schedule:
  type: daily_recurring
  execution: sequential
steps:
${stepLines.length > 0 ? `${stepLines.join('\n')}\n` : '[]\n'}`
}

function parseScalar(block: string, key: string): string | undefined {
  const m = block.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'))
  if (!m) return undefined
  let v = m[1].trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  return v
}

function parseParams(block: string): Record<string, string> {
  const params: Record<string, string> = {}
  const paramsMatch = block.match(/params:\s*\n((?:\s+.+\n?)*)/)
  if (!paramsMatch) return params
  for (const line of paramsMatch[1].split('\n')) {
    const m = line.match(/^\s+(\w+):\s*(.+)$/)
    if (m) {
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      params[m[1]] = v
    }
  }
  return params
}

function parseStepsSection(yaml: string): string[] {
  if (/^steps:\s*\[\s*\]/m.test(yaml)) return []

  const header = yaml.match(/^steps:\s*\n/m)
  if (!header || header.index == null) return []

  const start = header.index + header[0].length
  const rest = yaml.slice(start)
  const nextTopLevel = rest.match(/\n^[a-zA-Z_][\w-]*:/m)
  const section = (nextTopLevel?.index != null ? rest.slice(0, nextTopLevel.index) : rest).trim()
  if (!section || section === '[]') return []

  return section
    .split(/\n(?=\s*-\s+)/)
    .map((part) => part.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean)
}

function parseStepBlock(block: string): BuilderStep | null {
  const action = parseScalar(block, 'action') ?? ''
  const params = parseParams(block)

  if (action === 'open_app') {
    const step = createStep('open_app')
    step.network = networkFromPackage(params.package)
    return step
  }
  if (action === 'warmup_feed') {
    const step = createStep('scroll_feed')
    step.durationSec = Number(params.duration_sec) || 60
    return step
  }
  if (action === 'social_action' && params.behavior === 'search-feed') {
    const step = createStep('search_feed')
    step.query = params.query ?? ''
    step.count = Number(params.count) || 5
    return step
  }
  if (action === 'wait') {
    const step = createStep('wait')
    step.waitSec = Number(params.duration_sec) || 4
    return step
  }
  if (action === 'close_app') {
    return { ...createStep('close_app') }
  }
  if (action === 'device_control') {
    const kind = params.kind ?? 'tap_center'
    const type = (`ctrl_${kind}` as BuilderStepType)
    const step = createStep(type)
    if (kind === 'tap_custom') {
      step.tapRefX = Number(params.ref_x) || DEFAULT_TAP_REF.x
      step.tapRefY = Number(params.ref_y) || DEFAULT_TAP_REF.y
    }
    return step
  }
  return null
}

export const BUILDER_DRAFT_MARKER = '# builder-draft\n'

export function serializeVariablesWithDraft(draft: ScenarioDraft, base = ''): string {
  const prefix = base.trim() ? `${base.trim()}\n` : ''
  return `${prefix}${BUILDER_DRAFT_MARKER}${JSON.stringify(draft)}`
}

export function loadDraftFromFiles(
  files: { scenario_yaml: string; variables_yaml?: string },
  serial: string,
  _defaultVariables: string,
): ScenarioDraft {
  const fromYaml = parseDraftFromYaml(files.scenario_yaml, serial)

  const jsonPart = files.variables_yaml?.split(BUILDER_DRAFT_MARKER)[1]?.trim()
  if (!jsonPart) return fromYaml

  try {
    const parsed = JSON.parse(jsonPart) as ScenarioDraft
    const fromJson: ScenarioDraft = {
      ...emptyDraft(serial),
      ...parsed,
      id: parsed.id || fromYaml.id,
      steps: (parsed.steps ?? []).map((step) => {
        const legacyNetwork = (parsed as ScenarioDraft & { network?: SocialNetwork }).network ?? 'tiktok'
        return {
          ...createStep(step.type),
          ...step,
          uid: step.uid || newStepUid(),
          network: step.type === 'open_app' ? (step.network ?? legacyNetwork) : step.network ?? 'tiktok',
        }
      }),
    }
    // builder-draft в variables часто теряется при сохранении на бэкенде — YAML надёжнее
    if (fromYaml.steps.length > fromJson.steps.length) return fromYaml
    return fromJson
  } catch {
    return fromYaml
  }
}

export function variablesYamlForSave(draft: ScenarioDraft, defaultVariables: string): string {
  return serializeVariablesWithDraft(draft, defaultVariables)
}

export function parseDraftFromYaml(yaml: string, serial: string): ScenarioDraft {
  const id = parseScalar(yaml, 'id') ?? emptyDraft(serial).id
  const name = parseScalar(yaml, 'name') ?? 'Сценарий'
  const draft = emptyDraft(serial)
  draft.id = id
  draft.name = name

  const blocks = parseStepsSection(yaml)
  if (blocks.length === 0) return draft

  const steps: BuilderStep[] = []
  let firstAt: string | null = null
  let fallbackNetwork: SocialNetwork = 'tiktok'

  for (const block of blocks) {
    const at = parseScalar(block, 'at')
    if (at && !firstAt) firstAt = at

    const params = parseParams(block)
    if (params.network === 'instagram' || params.network === 'youtube' || params.network === 'tiktok') {
      fallbackNetwork = params.network
    }
    if (params.package?.includes('instagram')) fallbackNetwork = 'instagram'
    if (params.package?.includes('youtube')) fallbackNetwork = 'youtube'

    const step = parseStepBlock(block)
    if (!step) continue
    if (step.type === 'open_app' && !params.package) {
      step.network = fallbackNetwork
    }
    steps.push(step)
  }

  draft.startAt = firstAt ?? '10:00'
  draft.steps = steps
  return draft
}
