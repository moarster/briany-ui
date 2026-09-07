import { Tabs as Radix } from 'radix-ui'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <Radix.Root
      value={value}
      onValueChange={onValueChange}
      className={cx('flex min-h-0 flex-col', className)}
    >
      {children}
    </Radix.Root>
  )
}

export function TabList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Radix.List
      className={cx(
        'flex shrink-0 items-center gap-1 border-b border-[var(--border-default)] px-2',
        className,
      )}
    >
      {children}
    </Radix.List>
  )
}

export function Tab({
  value,
  children,
  count,
}: {
  value: string
  children: ReactNode
  count?: number
}) {
  return (
    <Radix.Trigger
      value={value}
      className={cx(
        'relative -mb-px flex items-center gap-1.5 border-b-2 border-transparent px-2.5 py-1.5',
        'text-xs font-medium text-[var(--text-muted)] transition-colors duration-[var(--duration-1)]',
        'hover:text-[var(--text-primary)]',
        'data-[state=active]:border-[var(--color-primary)] data-[state=active]:text-[var(--text-primary)]',
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="tabular rounded-[var(--radius-full)] bg-[var(--surface-3)] px-1.5 text-2xs">
          {count}
        </span>
      )}
    </Radix.Trigger>
  )
}

export function TabPanel({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  return (
    <Radix.Content value={value} className={cx('min-h-0 flex-1 outline-none', className)}>
      {children}
    </Radix.Content>
  )
}
