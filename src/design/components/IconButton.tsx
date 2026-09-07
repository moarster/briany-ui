import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Tooltip } from './Tooltip'

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Required: an icon-only control has no other accessible name. */
  label: string
  icon: ReactNode
  size?: 'sm' | 'md'
  tone?: 'default' | 'danger'
  /** Suppresses the tooltip where the surrounding control already explains the action. */
  showTooltip?: boolean
}

export function IconButton({
  label,
  icon,
  size = 'md',
  tone = 'default',
  showTooltip = true,
  className,
  ...rest
}: IconButtonProps) {
  const button = (
    <button
      type="button"
      aria-label={label}
      className={cx(
        'inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-transparent',
        'text-[var(--text-muted)] transition-colors duration-[var(--duration-1)]',
        'hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]',
        'disabled:pointer-events-none disabled:opacity-40',
        tone === 'danger' && 'hover:text-[var(--color-danger)]',
        size === 'sm' ? 'size-6' : 'size-7',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  )
  return showTooltip ? <Tooltip content={label}>{button}</Tooltip> : button
}
