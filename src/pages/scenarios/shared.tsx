import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export const EMPTY_SCENARIO = `id: new-scenario
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

export const EMPTY_VARIABLES = `warmup_profiles:
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

export const TIKTOK_PACKAGES = ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill']

export function buildTikTokFootballTemplate(serial: string, at = '10:55') {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const validFrom = `${y}-${m}-${d}T00:00:00+03:00`
  const validUntil = `${y}-${m}-${d}T23:59:59+03:00`.replace(
    /\d{4}-\d{2}-\d{2}/,
    (() => {
      const end = new Date(now)
      end.setMonth(end.getMonth() + 1)
      return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    })(),
  )
  return `id: tiktok-football-daily
name: "TikTok Football ежедневно ${at}"
serial: "${serial || '10.16.182.227:5555'}"
timezone: "Europe/Moscow"
valid_from: "${validFrom}"
valid_until: "${validUntil}"
schedule:
  type: daily_recurring
  execution: sequential
steps:
  - id: open_tiktok
    at: "${at}"
    action: open_app
    params:
      package: com.zhiliaoapp.musically
  - id: warmup_feed
    after_previous: true
    action: warmup_feed
    params:
      profile: tiktok_daily
      phase: pre_publish
  - id: search_football
    after_previous: true
    action: social_action
    params:
      network: tiktok
      behavior: search-feed
      query: Football
      count: "0"
      open_first_only: "true"
      skip_launch: "true"
  - id: wait_after_search
    after_previous: true
    action: wait
    params:
      duration_sec: "4"
  - id: scroll_after_search
    after_previous: true
    action: warmup_feed
    params:
      profile: tiktok_daily
      phase: pre_publish
  - id: close_tiktok
    after_previous: true
    after_failure: true
    action: close_app
    params:
      package: com.zhiliaoapp.musically
`
}

export function parseStepsFromYAML(yaml: string): { id: string; action: string }[] {
  const blocks = yaml.split(/\n\s*-\s+id:/)
  if (blocks.length <= 1) return []
  return blocks
    .slice(1)
    .map((block) => {
      const id = block.match(/^\s*(\S+)/)?.[1] ?? ''
      const action = block.match(/action:\s*(\S+)/)?.[1] ?? ''
      return { id, action }
    })
    .filter((s) => s.id)
}

export function issueColor(level: string) {
  return level === 'error' ? 'text-red-400' : 'text-amber-400'
}

export function CollapsibleSection({
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
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-300 hover:bg-surface-2 rounded-lg"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        {title}
      </button>
      {open && <div className="border-t border-border px-3 pb-2 pt-1.5 space-y-2">{children}</div>}
    </div>
  )
}
