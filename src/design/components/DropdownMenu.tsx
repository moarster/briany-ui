import { DropdownMenu as Radix } from 'radix-ui'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

const content =
  'glass z-[var(--z-overlay)] min-w-44 rounded-[var(--radius-md)] p-1 shadow-[var(--shadow-2)]'

const item =
  'flex cursor-default select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 ' +
  'text-xs text-[var(--text-secondary)] outline-none ' +
  'data-[highlighted]:bg-[var(--surface-3)] data-[highlighted]:text-[var(--text-primary)] ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-40'

export function Menu({
  trigger,
  children,
  align = 'end',
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
}) {
  return (
    <Radix.Root>
      <Radix.Trigger asChild>{trigger}</Radix.Trigger>
      <Radix.Portal>
        <Radix.Content align={align} sideOffset={4} className={content}>
          {children}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  )
}

export function MenuItem({
  children,
  onSelect,
  disabled,
  destructive,
  icon,
}: {
  children: ReactNode
  onSelect?: () => void
  disabled?: boolean
  destructive?: boolean
  icon?: ReactNode
}) {
  return (
    <Radix.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cx(
        item,
        destructive && 'text-[var(--color-danger)] data-[highlighted]:text-[var(--color-danger)]',
      )}
    >
      {icon}
      {children}
    </Radix.Item>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <Radix.Label className="px-2 py-1 text-2xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </Radix.Label>
  )
}

export function MenuSeparator() {
  return <Radix.Separator className="my-1 h-px bg-[var(--border-default)]" />
}
