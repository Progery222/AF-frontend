import { Navigate, useLocation } from 'react-router-dom'
import { loadAuth } from '@/lib/auth'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const auth = loadAuth()

  if (!auth) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
