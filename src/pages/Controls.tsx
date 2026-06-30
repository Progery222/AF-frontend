import { useState } from 'react'
import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { ActionButton } from '@/components/ActionButton'
import { SelectionBanner } from '@/components/SelectionBanner'
import { useBulkAction } from '@/hooks/useBulkAction'
import {
  customTapBody,
  DEFAULT_TAP_REF,
  feedGestureBody,
  feedGestureLabel,
  REF_SCREEN,
  resolveScreenSize,
} from '@/lib/feedGestures'
import type { BulkItem } from '@/lib/runOnPhones'
import type { FeedGestureKind } from '@/lib/feedGestures'
import {
  Home,
  ArrowLeft,
  ArrowRight,
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
  { id: 'left', kind: 'swipeLeft', label: 'Свайп влево', success: 'Свайп влево', icon: ArrowLeft },
  { id: 'right', kind: 'swipeRight', label: 'Свайп вправо', success: 'Свайп вправо', icon: ArrowRight },
]

export function ControlsPage() {
  const [tapRefX, setTapRefX] = useState(DEFAULT_TAP_REF.x)
  const [tapRefY, setTapRefY] = useState(DEFAULT_TAP_REF.y)
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

  const runCustomTap = () => {
    const items: BulkItem[] = targetPhones.map((phone) => {
      const size = resolveScreenSize(phone, screenSizeBySerial[phone.serial])
      const body = customTapBody(tapRefX, tapRefY, size)
      return { serial: phone.serial, method: 'POST', suffix: '/tap', body }
    })
    return runItems('tap-custom', items, `Тап (${tapRefX}, ${tapRefY})`)
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GESTURES.map(({ id, kind, label: btnLabel, success, icon: Icon }) => (
          <ActionButton
            key={id}
            variant="primary"
            className="w-full flex-col py-6"
            icon={<Icon className="h-6 w-6" />}
            loading={loading === id}
            onClick={() => runGesture(id, kind, success)}
          >
            {btnLabel}
          </ActionButton>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-300">Тап по координатам</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm">
            <span className="mb-1 block text-muted">X (эталон {REF_SCREEN.width})</span>
            <input
              type="number"
              min={0}
              max={REF_SCREEN.width}
              value={tapRefX}
              onChange={(e) => setTapRefX(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 font-mono"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Y (эталон {REF_SCREEN.height})</span>
            <input
              type="number"
              min={0}
              max={REF_SCREEN.height}
              value={tapRefY}
              onChange={(e) => setTapRefY(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface-3 px-3 py-2 font-mono"
            />
          </label>
          <ActionButton
            variant="primary"
            className="w-full py-3 sm:w-auto sm:min-w-[140px]"
            icon={<MousePointer className="h-4 w-4" />}
            loading={loading === 'tap-custom'}
            onClick={runCustomTap}
          >
            Тап
          </ActionButton>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted">
        Координаты жестов масштабируются под экран каждого телефона (эталон {REF_SCREEN.width}×
        {REF_SCREEN.height}). Пример для первого: свайп вверх {feedGestureLabel('swipeUp', refSize)},
        свайп влево {feedGestureLabel('swipeLeft', refSize)}, тап {feedGestureLabel('tap', refSize)}.
      </p>
    </div>
  )
}
