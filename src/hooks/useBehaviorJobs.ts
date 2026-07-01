import { useEffect, useMemo, useState } from 'react'
import { behaviorApi, type BehaviorJob, type JobStatus } from '@/api/behavior'
import { useToast } from '@/components/Toast'

const FINAL_STATUSES: JobStatus[] = ['done', 'failed']

export interface JobRow {
  key: string
  serial: string
  label: string
  jobId?: string
  status: JobStatus | 'request_error'
  error?: string
  result?: Record<string, unknown>
}

export function statusText(status: JobRow['status']) {
  switch (status) {
    case 'pending':
      return 'В очереди'
    case 'running':
      return 'Выполняется'
    case 'done':
      return 'Готово'
    case 'failed':
      return 'Ошибка job'
    case 'request_error':
      return 'Ошибка запуска'
  }
}

export function useBehaviorJobs() {
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [jobs, setJobs] = useState<JobRow[]>([])

  const runningJobs = useMemo(
    () => jobs.filter((job) => job.jobId && !FINAL_STATUSES.includes(job.status as JobStatus)),
    [jobs],
  )

  const updateJob = (key: string, patch: Partial<JobRow>) => {
    setJobs((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const fromJob = (job: BehaviorJob): Partial<JobRow> => ({
    jobId: job.id,
    status: job.status,
    error: job.error,
    result: job.result,
  })

  useEffect(() => {
    if (runningJobs.length === 0) return
    const timer = window.setInterval(() => {
      for (const row of runningJobs) {
        if (!row.jobId) continue
        behaviorApi
          .getJob(row.jobId)
          .then((job) => updateJob(row.key, fromJob(job)))
          .catch((e) => updateJob(row.key, { status: 'request_error', error: (e as Error).message }))
      }
    }, 2500)
    return () => window.clearInterval(timer)
  }, [runningJobs])

  const startJobs = async (
    id: string,
    actionLabel: string,
    serials: string[],
    runner: (serial: string) => Promise<BehaviorJob>,
  ) => {
    if (serials.length === 0) {
      toast('Сначала выберите телефон', 'error')
      return
    }
    setLoading(id)
    const runKey = `${Date.now()}-${id}`
    const rows = serials.map((serial) => ({
      key: `${runKey}-${serial}`,
      serial,
      label: actionLabel,
      status: 'pending' as const,
    }))
    setJobs((prev) => [...rows, ...prev].slice(0, 40))

    try {
      await Promise.all(
        rows.map(async (row) => {
          try {
            const job = await runner(row.serial)
            updateJob(row.key, fromJob(job))
          } catch (e) {
            updateJob(row.key, { status: 'request_error', error: (e as Error).message })
          }
        }),
      )
      toast(`${actionLabel}: отправлено на ${rows.length}`, 'success')
    } finally {
      setLoading(null)
    }
  }

  const addOrchJob = (serial: string, label: string, status: JobRow['status'], error?: string) => {
    const key = `${Date.now()}-orch-${serial}`
    setJobs((prev) => [{ key, serial, label, status, error }, ...prev].slice(0, 40))
  }

  return { loading, jobs, setJobs, startJobs, addOrchJob }
}
