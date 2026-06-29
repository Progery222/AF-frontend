import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { ActionButton } from '@/components/ActionButton'
import { SelectionBanner } from '@/components/SelectionBanner'
import { useBulkAction } from '@/hooks/useBulkAction'
import { feedGestureBody, feedGestureLabel, resolveScreenSize } from '@/lib/feedGestures'
import type { BulkItem } from '@/lib/runOnPhones'
import type { FeedGestureKind } from '@/lib/feedGestures'
import { ArrowDown, ArrowUp, MousePointer } from 'lucide-react'

const GESTURES: {
  id: string
  kind: FeedGestureKind
  label: string
  success: string
  icon: typeof ArrowUp
}[] = [
  { id: 'up', kind: 'swipeUp', label: 'Следующий пост', success: 'Свайп вверх', icon: ArrowUp },
  { id: 'down', kind: 'swipeDown', label: 'Предыдущий пост', success: 'Свайп вниз', icon: ArrowDown },
  { id: 'tap', kind: 'tap', label: 'Тап центр', success: 'Тап по центру', icon: MousePointer },
]

export function FeedPage() {
  const {
    hasSelection,
    label,
    isMulti,
    serials,
    targetPhones,
    staleCount,
    screenSizeBySerial,
    loading,
    runItems,
  } = useBulkAction()

  if (!hasSelection) return <NoPhoneSelected />

  const refSize = resolveScreenSize(
    targetPhones[0] ?? { serial: serials[0], screen_res_x: 0, screen_res_y: 0 },
    screenSizeBySerial[serials[0]],
  )

  const runGesture = (id: string, kind: FeedGestureKind, successLabel: string) => {
    const items: BulkItem[] = targetPhones.map((phone) => {
      const size = resolveScreenSize(phone, screenSizeBySerial[phone.serial])
      const body = feedGestureBody(kind, size)
      const suffix = kind === 'tap' ? '/tap' : '/swipe'
      return {
        serial: phone.serial,
        method: 'POST',
        suffix,
        body,
      }
    })
    return runItems(id, items, successLabel)
  }

  return (
    <div>
      <PageHeader
        title="Лента"
        description="Жесты через orchestrator → executor → ADB"
      />

      <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

      {staleCount > 0 && (
        <p className="mb-4 text-xs text-amber-400/90">
          {staleCount} устаревших serial убрано из выбора — обновите список на вкладке «Телефоны».
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        {GESTURES.map(({ id, kind, label: btnLabel, success, icon: Icon }) => (
          <ActionButton
            key={id}
            variant="primary"
            className="w-full py-6 flex-col"
            icon={<Icon className="h-6 w-6" />}
            loading={loading === id}
            onClick={() => runGesture(id, kind, success)}
          >
            {btnLabel}
          </ActionButton>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted">
        Координаты масштабируются под экран каждого телефона (эталон 1080×1920).
        Пример для первого: свайп вверх {feedGestureLabel('swipeUp', refSize)}, тап{' '}
        {feedGestureLabel('tap', refSize)}.
      </p>
    </div>
  )
}
