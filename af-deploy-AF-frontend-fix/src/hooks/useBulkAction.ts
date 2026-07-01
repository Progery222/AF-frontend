import { useState } from 'react'
import { useTargetPhones } from '@/hooks/useTargetPhones'
import {
  executeBulk,
  executeBulkItems,
  formatBulkToast,
  type BulkItem,
  type BulkOrchAction,
} from '@/lib/runOnPhones'
import { useToast } from '@/components/Toast'

export function useBulkAction() {
  const targets = useTargetPhones()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  const run = async (
    id: string,
    action: BulkOrchAction,
    successLabel: string,
  ) => {
    if (!targets.hasSelection) {
      toast('Нет доступных телефонов для действия', 'error')
      return null
    }
    setLoading(id)
    try {
      const result = await executeBulk(targets.serials, action)
      const { message, type } = formatBulkToast(successLabel, result)
      toast(message, type)
      return result
    } catch (e) {
      toast((e as Error).message, 'error')
      return null
    } finally {
      setLoading(null)
    }
  }

  const runItems = async (
    id: string,
    items: BulkItem[],
    successLabel: string,
    options?: { includeResults?: boolean },
  ) => {
    if (!targets.hasSelection || items.length === 0) {
      toast('Нет доступных телефонов для действия', 'error')
      return null
    }
    setLoading(id)
    try {
      const result = await executeBulkItems(items, options)
      const { message, type } = formatBulkToast(successLabel, result)
      toast(message, type)
      return result
    } catch (e) {
      toast((e as Error).message, 'error')
      return null
    } finally {
      setLoading(null)
    }
  }

  return { ...targets, loading, run, runItems }
}
