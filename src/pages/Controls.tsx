import { PageHeader, NoPhoneSelected } from '@/components/RequirePhone'
import { ActionButton } from '@/components/ActionButton'
import { SelectionBanner } from '@/components/SelectionBanner'
import { useBulkAction } from '@/hooks/useBulkAction'
import { Home, ArrowLeft, LayoutGrid, Power } from 'lucide-react'

const KEYS = [
  { key: 'home', label: 'Домой', icon: Home },
  { key: 'back', label: 'Назад', icon: ArrowLeft },
  { key: 'recents', label: 'Последние', icon: LayoutGrid },
  { key: 'power', label: 'Power', icon: Power },
] as const

function KeyPanel({ title, description, withPower }: { title: string; description: string; withPower?: boolean }) {
  const { hasSelection, label, isMulti, serials, loading, run } = useBulkAction()

  if (!hasSelection) return <NoPhoneSelected />

  const keys = KEYS.filter((k) => withPower || k.key !== 'power')

  return (
    <div>
      <PageHeader title={title} description={description} />
      <SelectionBanner label={label} isMulti={isMulti} count={serials.length} />
      <div className="grid sm:grid-cols-2 gap-3">
        {keys.map(({ key, label: keyLabel, icon: Icon }) => (
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
        {withPower && (
          <ActionButton
            variant="danger"
            className="py-8 flex-col sm:col-span-2"
            icon={<Power className="h-6 w-6" />}
            loading={loading === 'power'}
            onClick={() => run('power', { method: 'POST', suffix: '/key', body: { key: 'power' } }, 'Power')}
          >
            Power
          </ActionButton>
        )}
      </div>
    </div>
  )
}

export function ControlsPage() {
  return (
    <KeyPanel
      title="Управление"
      description="Системные кнопки: Home, Back, Recents, Power"
      withPower
    />
  )
}

export function AppPage() {
  return (
    <KeyPanel
      title="Приложение"
      description="Навигация: Домой, Назад, список недавних приложений"
    />
  )
}
