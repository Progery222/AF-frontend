import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadAuth, saveAuth } from '@/lib/auth'
import { ActionButton } from '@/components/ActionButton'
import { Lock } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const existing = loadAuth()
  const [username, setUsername] = useState(existing?.username ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const auth = { username: username.trim(), password }
    try {
      const res = await fetch('/api/orch/stats', {
        headers: {
          Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
        },
      })
      if (!res.ok) {
        setError(res.status === 401 ? 'Неверный логин или пароль' : `Ошибка ${res.status}`)
        return
      }
      saveAuth(auth)
      navigate('/', { replace: true })
    } catch {
      setError('Не удалось подключиться к API')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 p-6 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-accent/20 p-2">
            <Lock className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AF Farm</h1>
            <p className="text-sm text-muted">Вход в панель управления</p>
          </div>
        </div>

        <label className="block text-sm mb-1">Логин</label>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          required
        />

        <label className="block text-sm mb-1">Пароль</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          required
        />

        {error && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <ActionButton type="submit" variant="primary" className="w-full" loading={loading}>
          Войти
        </ActionButton>
      </form>
    </div>
  )
}
