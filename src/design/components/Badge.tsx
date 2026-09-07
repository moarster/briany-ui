import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--surface-3)] text-[var(--text-secondary)] border-[var(--border-default)]',
  primary:
    'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary-soft)]',
  accent:
    'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent-soft)]',
  success:
    'bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success-soft)]',
  warning:
    'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[var(--color-warning-soft)]',
  danger:
    'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger-soft)]',
  info: 'bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info-soft)]',
}

export type BadgeProps = {
  tone?: BadgeTone
  icon?: ReactNode
  mono?: boolean
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', icon, mono = false, className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-[var(--radius-full)] border px-1.5 py-px',
        'text-2xs font-medium leading-4 whitespace-nowrap',
        mono && 'font-[family-name:var(--font-mono)]',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
