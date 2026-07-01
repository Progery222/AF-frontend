import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { ActionButton } from './ActionButton'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

type Pending = ConfirmOptions & { resolve: (value: boolean) => void }

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve })
    })
  }, [])

  const close = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value)
      return null
    })
  }, [])

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, close])

  const title = pending?.title ?? 'Подтвердите действие'
  const confirmLabel = pending?.confirmLabel ?? 'ОК'
  const cancelLabel = pending?.cancelLabel ?? 'Отмена'
  const variant = pending?.variant ?? 'primary'

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Закрыть"
            onClick={() => close(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            className="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface-2 p-5 shadow-2xl"
          >
            <h2 id="confirm-title" className="text-base font-semibold text-slate-100">
              {title}
            </h2>
            <p id="confirm-message" className="mt-2 text-sm text-muted whitespace-pre-wrap">
              {pending.message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <ActionButton variant="ghost" onClick={() => close(false)}>
                {cancelLabel}
              </ActionButton>
              <ActionButton
                variant={variant === 'danger' ? 'danger' : 'primary'}
                onClick={() => close(true)}
              >
                {confirmLabel}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}
