import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  icon?: ReactNode
}

const VARIANTS = {
  primary: 'bg-accent hover:bg-accent-hover text-white border-transparent',
  secondary: 'bg-surface-3 hover:bg-border text-slate-200 border-border',
  danger: 'bg-red-900/60 hover:bg-red-800 text-red-100 border-red-800',
  ghost: 'bg-transparent hover:bg-surface-3 text-slate-300 border-border',
}

export function ActionButton({
  loading,
  variant = 'secondary',
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
