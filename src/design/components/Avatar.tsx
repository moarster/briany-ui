import { cx } from '../../lib/cx'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase()
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span
      title={name}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-full)]',
        'bg-[var(--color-primary-soft)] font-medium text-[var(--color-primary)]',
        size === 'sm' ? 'size-5 text-2xs' : 'size-6 text-xs',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
