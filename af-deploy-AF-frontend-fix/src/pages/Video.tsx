import { useEffect, useState } from 'react'
import { api, videoJobReady } from '@/api/orchestrator'
import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { ActionButton } from '@/components/ActionButton'
import { SelectionBanner } from '@/components/SelectionBanner'
import { ScreenshotQueuePanel } from '@/components/ScreenshotQueue'
import { useBulkAction } from '@/hooks/useBulkAction'
import { useScreenshotQueue, useJobStore } from '@/store'
import { useToast } from '@/components/Toast'
import { Film, Sparkles, RefreshCw, Send } from 'lucide-react'
import type { VideoJob } from '@/types'
import type { BulkItem } from '@/lib/runOnPhones'

const DEFAULT_PROMPT = import.meta.env.VITE_DEFAULT_AI_PROMPT ?? 'котики на закате'

export function VideoPage() {
  const { hasSelection, label, isMulti, serials, singleSerial, isSingle, loading, run, runItems } =
    useBulkAction()
  const snapshot = useScreenshotQueue((s) => s.snapshot)
  const lastJobId = useJobStore((s) => s.lastJobId)
  const setLastJobId = useJobStore((s) => s.setLastJobId)
  const { toast } = useToast()
  const [localLoading, setLocalLoading] = useState<string | null>(null)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [job, setJob] = useState<VideoJob | null>(null)
  const [poll, setPoll] = useState(false)

  useEffect(() => {
    if (!poll || !singleSerial || !lastJobId) return
    const id = setInterval(async () => {
      try {
        const j = await api.videoJobStatus(singleSerial, lastJobId)
        setJob(j)
        if (videoJobReady(j.status)) setPoll(false)
      } catch {
        setPoll(false)
      }
    }, 3000)
    return () => clearInterval(id)
  }, [poll, singleSerial, lastJobId])

  const busy = localLoading ?? loading

  const startScreensVideo = async () => {
    if (!hasSelection) return
    setLocalLoading('screens')
    try {
      if (isSingle && singleSerial) {
        const keys = snapshot(singleSerial)
        if (keys.length === 0) {
          toast('Нет скринов в очереди', 'error')
          return
        }
        const frameSec = keys.length > 10 ? 1 : 2
        const j = await api.videoFromScreenshots(singleSerial, keys, {
          width: 1080,
          height: 1920,
          frame_sec: frameSec,
        })
        setJob(j)
        if (j.id) {
          setLastJobId(j.id)
          setPoll(true)
        }
        toast('Видео из скринов запущено', 'success')
        return
      }

      const items: BulkItem[] = []
      for (const serial of serials) {
        const keys = snapshot(serial)
        if (keys.length === 0) {
          toast(`Нет скринов в очереди: ${serial}`, 'error')
          return
        }
        const frameSec = keys.length > 10 ? 1 : 2
        items.push({
          serial,
          method: 'POST',
          suffix: '/video/screenshots',
          body: {
            screenshot_keys: keys,
            profile: {
              width: 1080,
              height: 1920,
              frame_sec: frameSec,
            },
          },
        })
      }
      await runItems('screens', items, 'Видео из скринов')
    } finally {
      setLocalLoading(null)
    }
  }

  const startAIVideo = async () => {
    if (!prompt.trim()) return
    if (isSingle && singleSerial) {
      setLocalLoading('ai')
      try {
        const j = await api.videoAI(singleSerial, prompt.trim(), { width: 1080, height: 1920 })
        setJob(j)
        if (j.id) {
          setLastJobId(j.id)
          setPoll(true)
        }
        toast('AI-видео запущено', 'success')
      } catch (e) {
        toast((e as Error).message, 'error')
      } finally {
        setLocalLoading(null)
      }
      return
    }
    await run(
      'ai',
      {
        method: 'POST',
        suffix: '/video/ai',
        body: {
          prompt: prompt.trim(),
          duration_sec: 8,
          profile: { width: 1080, height: 1920 },
        },
      },
      'AI-видео',
    )
  }

  const refreshJob = async () => {
    if (!isSingle || !singleSerial || !lastJobId) {
      toast('Статус job доступен для одного телефона', 'error')
      return
    }
    setLocalLoading('status')
    try {
      const j = await api.videoJobStatus(singleSerial, lastJobId)
      setJob(j)
      toast('Статус обновлён', 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setLocalLoading(null)
    }
  }

  const pushToPhone = async () => {
    if (!isSingle || !singleSerial || !job?.output_key || !videoJobReady(job.status)) {
      toast('Отправка доступна для одного телефона с готовым job', 'error')
      return
    }
    setLocalLoading('push')
    try {
      await api.downloadContent(singleSerial, { object_key: job.output_key })
      toast('Видео отправлено на телефон', 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setLocalLoading(null)
    }
  }

  if (!hasSelection) return <NoPhoneSelected />

  const singleKeys = singleSerial ? snapshot(singleSerial) : []
  const totalQueue = serials.reduce((n, s) => n + snapshot(s).length, 0)

  return (
    <div>
      <PageHeader
        title="Видео"
        description="Генерация MP4 через video-generator (FFmpeg / Ollama)"
      />

      <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

      {isSingle && singleSerial && <ScreenshotQueuePanel serial={singleSerial} />}

      <div className="flex flex-wrap gap-2 mb-6 mt-4">
        <ActionButton
          variant="primary"
          icon={<Film className="h-4 w-4" />}
          loading={busy === 'screens'}
          disabled={isSingle ? singleKeys.length === 0 : totalQueue === 0}
          onClick={startScreensVideo}
        >
          Скрины→видео ({isSingle ? singleKeys.length : totalQueue})
        </ActionButton>
      </div>

      <div className="rounded-xl border border-border bg-surface-2 p-4 mb-6">
        <label className="block text-sm font-medium mb-2">Промпт AI-видео</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <ActionButton
          variant="primary"
          className="mt-3"
          icon={<Sparkles className="h-4 w-4" />}
          loading={loading === 'ai'}
          disabled={!prompt.trim()}
          onClick={startAIVideo}
        >
          AI видео
        </ActionButton>
      </div>

      {isSingle && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <ActionButton
              icon={<RefreshCw className="h-4 w-4" />}
              loading={busy === 'status'}
              onClick={refreshJob}
            >
              Статус job
            </ActionButton>
            <ActionButton
              variant="primary"
              icon={<Send className="h-4 w-4" />}
              loading={busy === 'push'}
              onClick={pushToPhone}
            >
              Видео на телефон
            </ActionButton>
          </div>

          {job && (
            <div className="rounded-xl border border-border bg-surface-2 p-4 space-y-2 text-sm">
              <div className="font-medium">Последний job</div>
              {job.id && <div className="font-mono text-xs text-muted">{job.id}</div>}
              <div>
                Status: <span className="text-slate-200">{job.status}</span>
                {poll && <span className="ml-2 text-accent text-xs">обновление…</span>}
              </div>
              {job.progress != null && job.progress > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>Прогресс</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              )}
              {job.output_key && (
                <div className="font-mono text-xs break-all text-muted">{job.output_key}</div>
              )}
              {job.error && <div className="text-red-400">{job.error}</div>}
            </div>
          )}
        </>
      )}

      {!isSingle && (
        <div className="rounded-xl border border-dashed border-border bg-surface-2 p-4 text-sm text-muted">
          Статус job и отправка на телефон — при выборе одного устройства. Генерация запускается на всех телефонах параллельно.
        </div>
      )}
    </div>
  )
}
