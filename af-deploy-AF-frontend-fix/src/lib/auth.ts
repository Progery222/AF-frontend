const STORAGE_KEY = 'af-basic-auth'

export interface BasicAuth {
  username: string
  password: string
}

export function loadAuth(): BasicAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BasicAuth
    if (!parsed.username || !parsed.password) return null
    return parsed
  } catch {
    return null
  }
}

export function saveAuth(auth: BasicAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

export function authHeader(auth: BasicAuth | null): Record<string, string> {
  if (!auth) return {}
  const token = btoa(`${auth.username}:${auth.password}`)
  return { Authorization: `Basic ${token}` }
}
