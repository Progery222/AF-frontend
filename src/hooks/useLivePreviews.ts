import { useEffect, useRef, useState } from 'react'
import { executeBulk } from '@/lib/runOnPhones'
import type { ScreenResult } from '@/types'

const DEFAULT_INTERVAL_MS = Number(import.meta.env.VITE_LIVE_PREVIEW_INTERVAL_MS ?? 5000)

export interface LivePreviewFrame {
  url?: string
  error?: string
  updatedAt?: number
}

export function useLivePreviews(
  serials: string[],
  enabled: boolean,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  const [frames, setFrames] = useState<Record<string, LivePreviewFrame>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [tick, setTick] = useState(0)
  const serialsKey = serials.join('\n')
  const inFlight = useRef(false)

  useEffect(() => {
    if (!enabled || serials.length === 0) {
      setFrames({})
      setRefreshing(false)
      return
    }

    let cancelled = false

    const refresh = async () => {
      if (inFlight.current) return
      inFlight.current = true
      setRefreshing(true)
      try {
        const result = await executeBulk(
          serials,
          { method: 'GET', suffix: '/screen?timeout_sec=15' },
          { includeResults: true },
        )

        if (cancelled) return

        const failed = new Map(result.failed.map((f) => [f.serial, f.error]))
        const next: Record<string, LivePreviewFrame> = {}

        for (const serial of serials) {
          const err = failed.get(serial)
          if (err) {
            next[serial] = { error: err, updatedAt: Date.now() }
            continue
          }
          const row = result.results?.find((r) => r.serial === serial)
          const body = row?.body as ScreenResult | undefined
          const url = body?.screenshot_url ?? body?.minio_key
          next[serial] = url
            ? { url, updatedAt: Date.now() }
            : { error: 'нет кадра', updatedAt: Date.now() }
        }

        setFrames(next)
        setTick((t) => t + 1)
      } catch (e) {
        if (!cancelled) {
          const message = (e as Error).message
          const next: Record<string, LivePreviewFrame> = {}
          for (const serial of serials) {
            next[serial] = { error: message, updatedAt: Date.now() }
          }
          setFrames(next)
        }
      } finally {
        inFlight.current = false
        if (!cancelled) setRefreshing(false)
      }
    }

    void refresh()
    const id = window.setInterval(() => void refresh(), intervalMs)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, serialsKey, intervalMs])

  return { frames, refreshing, tick }
}
