import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { FileTypeIcon } from '../../design/components'
import { cx } from '../../lib/cx'
import type { OpenTab } from './editor-store'

export function TabStrip({
  appKey,
  tabs,
  activeFileKey,
  isDirty,
  onClose,
}: {
  appKey: string
  tabs: OpenTab[]
  activeFileKey: string
  isDirty: (fileKey: string) => boolean
  onClose: (fileKey: string) => void
}) {
  return (
    <div role="tablist" className="flex min-w-0 items-end gap-px overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.fileKey === activeFileKey
        const dirty = isDirty(tab.fileKey)
        return (
          <div
            key={tab.fileKey}
            // Middle click closes, the way every editor does it.
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault()
                onClose(tab.fileKey)
              }
            }}
            className={cx(
              'group flex shrink-0 items-center gap-1.5 rounded-t-[var(--radius-sm)] border-b-2 px-2 py-1',
              active
                ? 'border-[var(--color-primary)] bg-[var(--surface-2)]'
                : 'border-transparent hover:bg-[var(--surface-2)]',
            )}
          >
            <Link
              to="/applications/$appKey/files/$fileKey"
              params={{ appKey, fileKey: tab.fileKey }}
              role="tab"
              aria-selected={active}
              className={cx(
                'flex items-center gap-1.5 text-xs',
                active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
              )}
            >
              <FileTypeIcon type={tab.type} className="size-3.5" decorative />
              <span className="max-w-40 truncate">{tab.name}</span>
              {dirty && (
                <span aria-label="Unsaved changes" className="text-[var(--color-warning)]">
                  *
                </span>
              )}
            </Link>
            <button
              type="button"
              aria-label={`Close ${tab.name}`}
              onClick={() => onClose(tab.fileKey)}
              className="rounded-[4px] p-0.5 text-[var(--text-muted)] opacity-0 hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] group-hover:opacity-100"
            >
              <X className="size-3" aria-hidden />
            </button>
          </div>
        )
      })}
    </div>
  )
}
