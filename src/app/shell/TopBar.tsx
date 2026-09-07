import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { Breadcrumb } from '../../design/components'
import type { Crumb } from '../../design/components'
import { t } from '../../lib/i18n'
import { useUiStore } from '../ui-store'

/** Breadcrumb on the left, contextual actions on the right, search entry in the middle. */
export function TopBar({ crumbs, actions }: { crumbs: Crumb[]; actions?: ReactNode }) {
  const openPalette = useUiStore((state) => state.setCommandPaletteOpen)

  return (
    <header className="glass sticky top-0 z-[var(--z-sticky)] flex h-12 shrink-0 items-center gap-3 rounded-none border-x-0 border-t-0 px-4">
      <div className="min-w-0 flex-1">
        <Breadcrumb items={crumbs} />
      </div>

      <button
        type="button"
        onClick={() => openPalette(true)}
        className="hidden items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-inset)] px-2 py-1 text-xs text-[var(--text-muted)] hover:border-[var(--border-strong)] sm:flex"
      >
        <Search className="size-3.5" aria-hidden />
        {t('common.search')}
        <kbd className="ml-2 rounded-[4px] border border-[var(--border-default)] px-1 text-2xs">
          {navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'}K
        </kbd>
      </button>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
