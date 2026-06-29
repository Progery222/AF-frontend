import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { ActionButton } from '@/components/ActionButton'
import { SelectionBanner } from '@/components/SelectionBanner'
import { useBulkAction } from '@/hooks/useBulkAction'
import { ArrowDown, ArrowUp, MousePointer } from 'lucide-react'

const SWIPE_UP = { x0: 540, y0: 1650, x1: 540, y1: 450 }
const SWIPE_DOWN = { x0: 540, y0: 450, x1: 540, y1: 1650 }
const TAP_CENTER = { x: 540, y: 960 }

export function FeedPage() {
  const { hasSelection, label, isMulti, serials, loading, run } = useBulkAction()

  if (!hasSelection) return <NoPhoneSelected />

  return (
    <div>
      <PageHeader
        title="Лента"
        description="Жесты через orchestrator → executor → ADB"
      />

      <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />

      <div className="grid sm:grid-cols-3 gap-3">
        <ActionButton
          variant="primary"
          className="w-full py-6 flex-col"
          icon={<ArrowUp className="h-6 w-6" />}
          loading={loading === 'up'}
          onClick={() =>
            run('up', { method: 'POST', suffix: '/swipe', body: SWIPE_UP }, 'Свайп вверх')
          }
        >
          Следующий пост
        </ActionButton>

        <ActionButton
          variant="primary"
          className="w-full py-6 flex-col"
          icon={<ArrowDown className="h-6 w-6" />}
          loading={loading === 'down'}
          onClick={() =>
            run('down', { method: 'POST', suffix: '/swipe', body: SWIPE_DOWN }, 'Свайп вниз')
          }
        >
          Предыдущий пост
        </ActionButton>

        <ActionButton
          variant="primary"
          className="w-full py-6 flex-col"
          icon={<MousePointer className="h-6 w-6" />}
          loading={loading === 'tap'}
          onClick={() =>
            run(
              'tap',
              { method: 'POST', suffix: '/tap', body: { x: TAP_CENTER.x, y: TAP_CENTER.y } },
              'Тап по центру',
            )
          }
        >
          Тап центр
        </ActionButton>
      </div>

      <p className="mt-6 text-xs text-muted">
        Координаты: свайп вверх (540,1650)→(540,450), вниз — обратно, тап (540,960).
      </p>
    </div>
  )
}
