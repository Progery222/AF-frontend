import type { SocialNetwork } from '@/api/behavior'
import { TIKTOK_PACKAGES } from '@/pages/scenarios/shared'

export type BuilderStepType = 'open_app' | 'scroll_feed' | 'search_feed' | 'wait' | 'close_app'

export interface BuilderStep {
  uid: string
  type: BuilderStepType
  durationSec: number
  query: string
  count: number
  waitSec: number
}

export interface ScenarioDraft {
  id: string
  name: string
  startAt: string
  network: SocialNetwork
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
  { type: 'search_feed', title: 'Поиск', description: 'Поисковый запрос и число роликов' },
  { type: 'wait', title: 'Пауза', description: 'Ожидание между шагами' },
  { type: 'close_app', title: 'Закрыть приложение', description: 'Выход из приложения' },
]

export function stepTypeTitle(type: BuilderStepType): string {
  return STEP_TYPE_CATALOG.find((s) => s.type === type)?.title ?? type
}

export function newStepUid(): string {
  return `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function createStep(type: BuilderStepType): BuilderStep {
  return {
    uid: newStepUid(),
    type,
    durationSec: 60,
    query: '',
    count: 5,
    waitSec: 4,
  }
}

export function emptyDraft(_serial: string): ScenarioDraft {
  return {
    id: `scenario-${Date.now().toString(36)}`,
    name: 'Новый сценарий',
    startAt: '10:00',
    network: 'tiktok',
    steps: [],
  }
}

function packageForNetwork(network: SocialNetwork): string {
  if (network === 'tiktok') return TIKTOK_PACKAGES[0]
  if (network === 'instagram') return 'com.instagram.android'
  return 'com.google.android.youtube'
}

function defaultStepId(type: BuilderStepType, index: number): string {
  const base: Record<BuilderStepType, string> = {
    open_app: 'open_app',
    scroll_feed: 'scroll_feed',
    search_feed: 'search_feed',
    wait: 'wait',
    close_app: 'close_app',
  }
  return index > 0 ? `${base[type]}_${index + 1}` : base[type]
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
  const pkg = packageForNetwork(draft.network)
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const validFrom = `${y}-${m}-${d}T00:00:00+03:00`
  const end = new Date(now)
  end.setMonth(end.getMonth() + 1)
  const validUntil = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}T23:59:59+03:00`

  const stepLines: string[] = []

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
      case 'open_app':
        lines.push('    action: open_app', '    params:', `      package: ${pkg}`)
        break
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
      case 'search_feed':
        lines.push(
          '    action: social_action',
          '    params:',
          `      network: ${draft.network}`,
          '      behavior: search-feed',
          `      query: ${yamlQuote(step.query.trim() || 'Football')}`,
          `      count: "${step.count}"`,
          '      open_first_only: "true"',
          '      skip_launch: "true"',
        )
        break
      case 'wait':
        lines.push('    action: wait', '    params:', `      duration_sec: "${step.waitSec}"`)
        break
      case 'close_app':
        lines.push('    action: close_app', '    params:', `      package: ${pkg}`)
        break
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

export function parseDraftFromYaml(yaml: string, serial: string): ScenarioDraft {
  const id = parseScalar(yaml, 'id') ?? emptyDraft(serial).id
  const name = parseScalar(yaml, 'name') ?? 'Сценарий'
  const blocks = yaml.split(/\n\s*-\s+id:/)
  const draft = emptyDraft(serial)
  draft.id = id
  draft.name = name

  if (blocks.length <= 1) return draft

  const steps: BuilderStep[] = []
  let firstAt: string | null = null
  let network: SocialNetwork = 'tiktok'

  blocks.slice(1).forEach((block) => {
    const action = parseScalar(block, 'action') ?? ''
    const params = parseParams(block)
    const at = parseScalar(block, 'at')
    if (at && !firstAt) firstAt = at

    if (params.network === 'instagram' || params.network === 'youtube' || params.network === 'tiktok') {
      network = params.network
    }
    if (params.package?.includes('instagram')) network = 'instagram'
    if (params.package?.includes('youtube')) network = 'youtube'

    if (action === 'open_app') {
      steps.push({ ...createStep('open_app') })
      return
    }
    if (action === 'warmup_feed') {
      const step = createStep('scroll_feed')
      step.durationSec = Number(params.duration_sec) || 60
      steps.push(step)
      return
    }
    if (action === 'social_action' && params.behavior === 'search-feed') {
      const step = createStep('search_feed')
      step.query = params.query ?? ''
      step.count = Number(params.count) || 5
      steps.push(step)
      return
    }
    if (action === 'wait') {
      const step = createStep('wait')
      step.waitSec = Number(params.duration_sec) || 4
      steps.push(step)
      return
    }
    if (action === 'close_app') {
      steps.push({ ...createStep('close_app') })
    }
  })

  draft.startAt = firstAt ?? '10:00'
  draft.network = network
  draft.steps = steps
  return draft
}
