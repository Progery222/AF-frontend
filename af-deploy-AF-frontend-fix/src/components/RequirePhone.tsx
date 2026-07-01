import { Link } from 'react-router-dom'
import { Smartphone } from 'lucide-react'
import { ActionButton } from './ActionButton'

export function NoPhoneSelected() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-2 py-16 px-6 text-center">
      <Smartphone className="h-12 w-12 text-muted mb-4" />
      <h2 className="text-lg font-medium mb-2">Сначала выберите телефон</h2>
      <p className="text-sm text-muted mb-6 max-w-sm">
        Перейдите в раздел «Телефоны» и выберите одно или несколько устройств, либо нажмите «Выбрать все».
      </p>
      <Link to="/phones">
        <ActionButton variant="primary">Выбрать телефон</ActionButton>
      </Link>
    </div>
  )
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
  )
}
