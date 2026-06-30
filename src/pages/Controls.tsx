import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { ActionButton } from '@/components/ActionButton'
import { SelectionBanner } from '@/components/SelectionBanner'
import { useBulkAction } from '@/hooks/useBulkAction'
import { feedGestureBody, feedGestureLabel, resolveScreenSize } from '@/lib/feedGestures'
import type { BulkItem } from '@/lib/runOnPhones'
import type { FeedGestureKind } from '@/lib/feedGestures'
import {
  Home,
  ArrowLeft,
  LayoutGrid,
  Power,
  ArrowDown,
  ArrowUp,
  MousePointer,
} from 'lucide-react'

const KEYS = [
  { key: 'home', label: 'Домой', icon: Home },
  { key: 'back', label: 'Назад', icon: ArrowLeft },
  { key: 'recents', label: 'Последние', icon: LayoutGrid },
  { key: 'power', label: 'Power', icon: Power },
] as const

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

export function ControlsPage() {
  const {
    hasSelection,
    label,
    isMulti,
    serials,
    targetPhones,
    staleCount,
    screenSizeBySerial,
    loading,
    run,
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
      return { serial: phone.serial, method: 'POST', suffix, body }
    })
    return runItems(id, items, successLabel)
  }

  return (
    <div>
      <PageHeader
        title="Управление"
        description="Системные кнопки и жесты ленты (orchestrator → executor → ADB)"
      />

      <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

      {staleCount > 0 && (
        <p className="mb-4 text-xs text-amber-400/90">
          {staleCount} устаревших serial убрано из выбора — обновите список на вкладке «Телефоны».
        </p>
      )}

      <h2 className="mb-3 text-sm font-medium text-slate-300">Системные кнопки</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {KEYS.filter((k) => k.key !== 'power').map(({ key, label: keyLabel, icon: Icon }) => (
          <ActionButton
            key={key}
            variant="primary"
            className="py-8 flex-col"
            icon={<Icon className="h-6 w-6" />}
            loading={loading === key}
            onClick={() =>
              run(key, { method: 'POST', suffix: '/key', body: { key } }, keyLabel)
            }
          >
            {keyLabel}
          </ActionButton>
        ))}
        <ActionButton
          variant="danger"
          className="py-8 flex-col sm:col-span-2"
          icon={<Power className="h-6 w-6" />}
          loading={loading === 'power'}
          onClick={() => run('power', { method: 'POST', suffix: '/key', body: { key: 'power' } }, 'Power')}
        >
          Power
        </ActionButton>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-medium text-slate-300">Лента</h2>
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
        Координаты жестов масштабируются под экран каждого телефона (эталон 1080×1920).
        Пример для первого: свайп вверх {feedGestureLabel('swipeUp', refSize)}, тап{' '}
        {feedGestureLabel('tap', refSize)}.
      </p>
    </div>
  )
}
