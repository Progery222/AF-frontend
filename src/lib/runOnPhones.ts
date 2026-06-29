import { authHeader, loadAuth } from '@/lib/auth'

const BULK_BASE = import.meta.env.VITE_BULK_API ?? '/api/bulk'

export interface BulkOrchAction {
  method: 'GET' | 'POST' | 'DELETE'
  suffix: string
  body?: unknown
}

export interface BulkItem {
  serial: string
  method?: 'GET' | 'POST' | 'DELETE'
  suffix?: string
  body?: unknown
  steps?: BulkOrchAction[]
}

export interface BulkResult {
  ok: number
  failed: { serial: string; error: string }[]
  total: number
  results?: { serial: string; body?: unknown }[]
}

interface BulkPostOptions {
  includeResults?: boolean
}

async function postBulk<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BULK_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(loadAuth()),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  return res.json() as Promise<T>
}

function normalizeBulk(data: {
  ok: number
  total: number
  failed?: { serial: string; error: string }[]
  results?: { serial: string; body?: unknown }[]
}): BulkResult {
  return {
    ok: data.ok,
    total: data.total,
    failed: data.failed ?? [],
    results: data.results,
  }
}

/** Параллельный fan-out через bulk-proxy (без лимита браузера на соединения). */
export async function executeBulk(
  serials: string[],
  action: BulkOrchAction,
  options?: BulkPostOptions,
): Promise<BulkResult> {
  if (serials.length === 0) {
    return { ok: 0, failed: [], total: 0 }
  }
  if (serials.length === 1 && !options?.includeResults) {
    const { orchRequest } = await import('@/api/client')
    try {
      await orchRequest(serials[0], action)
      return { ok: 1, failed: [], total: 1 }
    } catch (e) {
      return {
        ok: 0,
        failed: [{ serial: serials[0], error: (e as Error).message }],
        total: 1,
      }
    }
  }

  const data = await postBulk<BulkResult>('/orch', {
    serials,
    method: action.method,
    suffix: action.suffix,
    body: action.body ?? undefined,
    include_results: options?.includeResults ?? false,
  })
  return normalizeBulk(data)
}

export async function executeBulkItems(
  items: BulkItem[],
  options?: BulkPostOptions,
): Promise<BulkResult> {
  if (items.length === 0) {
    return { ok: 0, failed: [], total: 0 }
  }
  if (items.length === 1 && !options?.includeResults) {
    const it = items[0]
    try {
      const { orchRequest } = await import('@/api/client')
      if (it.steps?.length) {
        for (const step of it.steps) {
          await orchRequest(it.serial, step)
        }
      } else if (it.method && it.suffix) {
        await orchRequest(it.serial, { method: it.method, suffix: it.suffix, body: it.body })
      } else {
        throw new Error('bulk item requires method+suffix or steps')
      }
      return { ok: 1, failed: [], total: 1 }
    } catch (e) {
      return {
        ok: 0,
        failed: [{ serial: it.serial, error: (e as Error).message }],
        total: 1,
      }
    }
  }

  const data = await postBulk<BulkResult>('/orch', {
    items,
    include_results: options?.includeResults ?? false,
  })
  return normalizeBulk(data)
}

export function formatBulkToast(label: string, result: BulkResult): { message: string; type: 'success' | 'error' } {
  if (result.failed.length === 0) {
    return { message: `${label}: ${result.ok}/${result.total}`, type: 'success' }
  }
  if (result.ok > 0) {
    return {
      message: `${label}: ${result.ok}/${result.total}, ошибок ${result.failed.length}`,
      type: 'error',
    }
  }
  return { message: `${label}: ошибка на всех ${result.total}`, type: 'error' }
}

/** @deprecated Используйте executeBulk — браузер сериализует fetch по лимиту соединений. */
export async function runOnPhones(
  serials: string[],
  fn: (serial: string) => Promise<unknown>,
): Promise<BulkResult> {
  const results = await Promise.allSettled(serials.map((serial) => fn(serial)))
  const failed: BulkResult['failed'] = []

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const reason = result.reason
      failed.push({
        serial: serials[index],
        error: reason instanceof Error ? reason.message : String(reason),
      })
    }
  })

  return {
    ok: results.length - failed.length,
    failed,
    total: serials.length,
  }
}
