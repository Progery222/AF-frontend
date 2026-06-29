import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import { useToast } from '@/components/Toast'
import { Pencil, Check, X } from 'lucide-react'

interface StandSeqEditorProps {
  serial: string
  value?: number | null
  compact?: boolean
  className?: string
}

export function StandSeqEditor({ serial, value, compact, className = '' }: StandSeqEditorProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: (next: number | null) => api.setStandSeqNumber(serial, next),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['phones'] })
      setEditing(false)
      toast('Номер стенда сохранён', 'success')
    },
    onError: (e: Error) => {
      toast(e.message || 'Не удалось сохранить номер', 'error')
    },
  })

  const startEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDraft(value != null ? String(value) : '')
    setEditing(true)
  }

  const cancelEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditing(false)
  }

  const saveEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const trimmed = draft.trim()
    if (trimmed === '') {
      mutation.mutate(null)
      return
    }
    const n = Number(trimmed)
    if (!Number.isInteger(n) || n < -32768 || n > 32767) {
      toast('Введите целое число от -32768 до 32767', 'error')
      return
    }
    mutation.mutate(n)
  }

  const textSize = compact ? 'text-[10px]' : 'text-xs'

  if (editing) {
    return (
      <div
        className={`flex items-center gap-1 ${textSize} ${className}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="text-muted shrink-0">Стенд:</span>
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-16 rounded border border-border bg-surface-3 px-1 py-0.5 text-xs font-mono"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit(e as unknown as React.MouseEvent)
            if (e.key === 'Escape') cancelEdit(e as unknown as React.MouseEvent)
          }}
        />
        <button
          type="button"
          className="text-accent hover:text-white"
          onClick={saveEdit}
          disabled={mutation.isPending}
          title="Сохранить"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button type="button" className="text-muted hover:text-white" onClick={cancelEdit} title="Отмена">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 ${textSize} text-muted ${className}`}>
      <span>
        Стенд:{' '}
        <span className="font-mono text-slate-200">{value != null ? value : '—'}</span>
      </span>
      <button
        type="button"
        className="text-muted hover:text-accent shrink-0"
        onClick={startEdit}
        onMouseDown={(e) => e.stopPropagation()}
        title="Редактировать номер стенда"
      >
        <Pencil className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      </button>
    </div>
  )
}
