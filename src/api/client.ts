import { authHeader, clearAuth, loadAuth } from '@/lib/auth'

const ORCH_BASE = import.meta.env.VITE_ORCH_API ?? '/api/orch'
const PROV_BASE = import.meta.env.VITE_PROV_API ?? '/api/prov'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string }
    return data.error ?? data.message ?? res.statusText
  } catch {
    return res.statusText
  }
}

async function request<T>(
  base: string,
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs, ...fetchInit } = init ?? {}
  const controller = new AbortController()
  const timer =
    timeoutMs != null
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined

  try {
    const res = await fetch(`${base}${path}`, {
      ...fetchInit,
      signal: controller.signal,
      headers: {
        ...(fetchInit.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...authHeader(loadAuth()),
        ...fetchInit.headers,
      },
    })
    if (!res.ok) {
      if (res.status === 401 && !window.location.pathname.startsWith('/login')) {
        clearAuth()
        window.location.replace('/login')
      }
      throw new ApiError(await parseError(res), res.status)
    }
    if (res.status === 204) return undefined as T
    const text = await res.text()
    if (!text) return undefined as T
    return JSON.parse(text) as T
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function encodeSerial(serial: string): string {
  return encodeURIComponent(serial)
}

export function phonePath(serial: string, suffix = ''): string {
  return `/phones/${encodeSerial(serial)}${suffix}`
}

export const orch = {
  get: <T>(path: string, timeoutMs?: number) =>
    request<T>(ORCH_BASE, path, { method: 'GET', timeoutMs }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(ORCH_BASE, path, {
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(ORCH_BASE, path, { method: 'DELETE' }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(ORCH_BASE, path, {
      method: 'PATCH',
      body: body != null ? JSON.stringify(body) : undefined,
    }),
}

export const prov = {
  get: <T>(path: string) => request<T>(PROV_BASE, path, { method: 'GET' }),
}

export async function orchRequest(
  serial: string,
  action: { method: 'GET' | 'POST' | 'DELETE' | 'PATCH'; suffix: string; body?: unknown },
  timeoutMs?: number,
): Promise<void> {
  const path = phonePath(serial, action.suffix)
  const body = action.body != null ? JSON.stringify(action.body) : undefined
  await request(ORCH_BASE, path, {
    method: action.method,
    body,
    timeoutMs,
  })
}
