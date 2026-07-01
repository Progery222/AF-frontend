import type { SocialNetwork } from '@/api/behavior'
import { EMPTY_VARIABLES, TIKTOK_PACKAGES } from '@/pages/scenarios/shared'

export const ELEMENTS_STORAGE_ID = 'elements-config'

export type ElementId = 'open_tiktok' | 'scroll_feed' | 'search_feed' | 'close_tiktok'

export interface PhoneElementConfig {
  network: SocialNetwork
  scroll: { durationSec: number }
  search: { query: string; count: number; likeProbability: number }
  scheduleAt: string
}

export interface ElementDef {
  id: ElementId
  title: string
  description: string
}

export const ELEMENT_CATALOG: ElementDef[] = [
  {
    id: 'open_tiktok',
    title: 'Открыть приложение',
    description: 'Запуск соцсети на телефоне',
  },
  {
    id: 'scroll_feed',
    title: 'Скролл ленты',
    description: 'Прогрев ленты — длительность в секундах на каждый телефон',
  },
  {
    id: 'search_feed',
    title: 'Поиск',
    description: 'Поисковый запрос и число роликов — своё значение на телефон',
  },
  {
    id: 'close_tiktok',
    title: 'Закрыть приложение',
    description: 'Выход из соцсети',
  },
]

export function defaultElementConfig(): PhoneElementConfig {
  return {
    network: 'tiktok',
    scroll: { durationSec: 60 },
    search: { query: '', count: 5, likeProbability: 0 },
    scheduleAt: '10:00',
  }
}

export function parseElementConfig(raw: string | undefined): PhoneElementConfig {
  const base = defaultElementConfig()
  if (!raw?.trim()) return base
  try {
    const parsed = JSON.parse(raw) as Partial<PhoneElementConfig>
    return {
      network: parsed.network ?? base.network,
      scroll: { ...base.scroll, ...parsed.scroll },
      search: { ...base.search, ...parsed.search },
      scheduleAt: parsed.scheduleAt ?? base.scheduleAt,
    }
  } catch {
    return base
  }
}

export function serializeElementConfig(config: PhoneElementConfig): string {
  return JSON.stringify(config, null, 2)
}

function tiktokPackage(network: SocialNetwork): string {
  if (network === 'tiktok') return TIKTOK_PACKAGES[0]
  if (network === 'instagram') return 'com.instagram.android'
  return 'com.google.android.youtube'
}

export function buildScenarioYamlFromElements(serial: string, config: PhoneElementConfig): string {
  const at = config.scheduleAt || '10:00'
  const pkg = tiktokPackage(config.network)
  const query = config.search.query.trim() || 'Football'
  const count = String(config.search.count)
  const duration = String(config.scroll.durationSec)

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const validFrom = `${y}-${m}-${d}T00:00:00+03:00`
  const end = new Date(now)
  end.setMonth(end.getMonth() + 1)
  const validUntil = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}T23:59:59+03:00`

  return `id: ${ELEMENTS_STORAGE_ID}
name: "Элементы: ${config.network}"
serial: "${serial}"
timezone: "Europe/Moscow"
valid_from: "${validFrom}"
valid_until: "${validUntil}"
schedule:
  type: daily_recurring
  execution: sequential
steps:
  - id: open_app
    at: "${at}"
    action: open_app
    params:
      package: ${pkg}
  - id: scroll_feed
    after_previous: true
    action: warmup_feed
    params:
      profile: tiktok_daily
      phase: pre_publish
      duration_sec: "${duration}"
      skip_launch: "true"
  - id: search_feed
    after_previous: true
    action: social_action
    params:
      network: ${config.network}
      behavior: search-feed
      query: ${query}
      count: "${count}"
      open_first_only: "true"
      skip_launch: "true"
  - id: close_app
    after_previous: true
    after_failure: true
    action: close_app
    params:
      package: ${pkg}
`
}

export function elementConfigScenarioFiles(serial: string, config: PhoneElementConfig) {
  return {
    scenario_yaml: buildScenarioYamlFromElements(serial, config),
    variables_yaml: `${EMPTY_VARIABLES}\n# element-config\n${serializeElementConfig(config)}`,
  }
}
