import { Dialog as RadixDialog } from 'radix-ui'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { t } from '../../lib/i18n'

export type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg'
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' } as const

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'md',
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/50" />
        <RadixDialog.Content
          className={cx(
            'glass fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-3)]',
            'max-h-[calc(100vh-4rem)] overflow-y-auto',
            widths[width],
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <RadixDialog.Title className="text-md font-semibold text-[var(--text-primary)]">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-xs text-[var(--text-muted)]">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label={t('common.close')}
              className="-mr-1 -mt-1 rounded-[var(--radius-sm)] p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            >
              <X className="size-4" aria-hidden />
            </RadixDialog.Close>
          </div>
          {children}
          {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
