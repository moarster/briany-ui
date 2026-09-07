import { AlertDialog as RadixAlertDialog } from 'radix-ui'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { t } from '../../lib/i18n'
import { Button } from './Button'
import { Input } from './Input'
import { SeverityIcon } from './SeverityIcon'

export type AlertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  /**
   * When set, the confirm button stays disabled until the user types this value. Used
   * where the action cascades - deleting an application undeploys it first.
   */
  challenge?: { value: string; label: string }
  onConfirm: () => void
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = t('common.confirm'),
  cancelLabel = t('common.cancel'),
  destructive = false,
  loading = false,
  challenge,
  onConfirm,
}: AlertDialogProps) {
  const [typed, setTyped] = useState('')
  const blocked = challenge !== undefined && typed !== challenge.value

  return (
    <RadixAlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped('')
        onOpenChange(next)
      }}
    >
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/50" />
        <RadixAlertDialog.Content
          className={cx(
            'glass fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[calc(100vw-2rem)] max-w-md',
            '-translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-3)]',
          )}
        >
          <div className="flex gap-3">
            {destructive && <SeverityIcon severity="error" className="mt-0.5 size-5" />}
            <div className="min-w-0 flex-1">
              <RadixAlertDialog.Title className="text-md font-semibold text-[var(--text-primary)]">
                {title}
              </RadixAlertDialog.Title>
              <RadixAlertDialog.Description asChild>
                <div className="mt-1.5 text-xs leading-[var(--leading-body)] text-[var(--text-secondary)]">
                  {description}
                </div>
              </RadixAlertDialog.Description>
              {challenge && (
                <label className="mt-4 block">
                  <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    {challenge.label}
                  </span>
                  <Input
                    mono
                    autoFocus
                    value={typed}
                    onChange={(event) => setTyped(event.target.value)}
                    placeholder={challenge.value}
                  />
                </label>
              )}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <RadixAlertDialog.Cancel asChild>
              <Button variant="ghost">{cancelLabel}</Button>
            </RadixAlertDialog.Cancel>
            <Button
              variant={destructive ? 'danger' : 'primary'}
              loading={loading}
              disabled={blocked}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  )
}
