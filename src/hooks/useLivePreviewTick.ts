import { useEffect, useState } from 'react'

const DEFAULT_INTERVAL_MS = Number(import.meta.env.VITE_LIVE_PREVIEW_INTERVAL_MS ?? 5000)

/** Тик обновления для лайв-превью (каждый тик перезагружает кадры). */
export function useLivePreviewTick(enabled: boolean, intervalMs = DEFAULT_INTERVAL_MS) {
  const [tick, setTick] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setRefreshing(false)
      return
    }

    let cancelled = false
    const refresh = () => {
      if (cancelled) return
      setRefreshing(true)
      setTick((t) => t + 1)
      window.setTimeout(() => {
        if (!cancelled) setRefreshing(false)
      }, 800)
    }

    refresh()
    const id = window.setInterval(refresh, intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, intervalMs])

  return { tick, refreshing }
}
