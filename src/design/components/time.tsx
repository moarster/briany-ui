import { absolute, duration as humaniseDuration, relative, truncateMiddle } from '../../lib/format'
import { cx } from '../../lib/cx'
import { CopyButton } from './CopyButton'
import { Tooltip } from './Tooltip'

/** Relative in the cell, absolute in the tooltip. */
export function RelativeTime({ value, className }: { value?: string | null; className?: string }) {
  if (!value) return <span className={cx('text-[var(--text-muted)]', className)}>-</span>
  return (
    <Tooltip content={absolute(value)}>
      <time dateTime={value} className={cx('whitespace-nowrap', className)}>
        {relative(value)}
      </time>
    </Tooltip>
  )
}

export function Duration({ millis, className }: { millis?: number | null; className?: string }) {
  return (
    <span className={cx('tabular whitespace-nowrap', className)}>{humaniseDuration(millis)}</span>
  )
}

/**
 * An id, hash or deployment id: mono, truncated in the middle, with the full value in a
 * tooltip and a copy button. Operators paste these into log queries constantly.
 */
export function Identifier({
  value,
  keep = 8,
  copy = true,
}: {
  value: string
  keep?: number
  copy?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Tooltip content={value} wide>
        <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]">
          {truncateMiddle(value, keep)}
        </span>
      </Tooltip>
      {copy && <CopyButton value={value} />}
    </span>
  )
}
