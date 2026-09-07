import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cx } from '../../lib/cx'

export type Severity = 'error' | 'warning' | 'info' | 'success'

const severities = {
  error: { Icon: CircleAlert, color: 'text-[var(--color-danger)]', label: 'Error' },
  warning: { Icon: TriangleAlert, color: 'text-[var(--color-warning)]', label: 'Warning' },
  info: { Icon: Info, color: 'text-[var(--color-info)]', label: 'Information' },
  success: { Icon: CircleCheck, color: 'text-[var(--color-success)]', label: 'Success' },
} as const

/** Severity is a colour plus an icon, never a colour alone. */
export function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  const { Icon, color, label } = severities[severity]
  return (
    <Icon role="img" aria-label={label} className={cx('size-3.5 shrink-0', color, className)} />
  )
}
