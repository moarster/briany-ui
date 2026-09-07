import { Link } from '@tanstack/react-router'
import { Inbox, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { isProblemError } from '../../api'
import { cx } from '../../lib/cx'
import { t } from '../../lib/i18n'
import { Button } from './Button'
import { CopyButton } from './CopyButton'
import { SeverityIcon } from './SeverityIcon'

/** Skeletons match the final layout, so the first paint does not jump. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx('animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-2)]', className)}
    />
  )
}

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label={t('common.loading')} className="flex flex-col gap-px">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex h-[var(--row-height)] items-center gap-4 px-3">
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={column} className={cx('h-3', column === 0 ? 'w-48' : 'w-24')} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Empty states explain the concept and offer the primary action. Never a shrug. */
export function EmptyState({
  title,
  detail,
  action,
  icon,
}: {
  title: string
  detail: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="text-[var(--text-muted)]">
        {icon ?? <Inbox className="size-7" aria-hidden />}
      </div>
      <div className="max-w-md">
        <h3 className="text-md font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="mt-1.5 text-xs leading-[var(--leading-body)] text-[var(--text-muted)]">
          {detail}
        </p>
      </div>
      {action}
    </div>
  )
}

/**
 * The failed-region and failed-route surface. Always renders `Problem.detail`, and offers
 * the machine-readable payload for a bug report rather than printing a status code.
 */
export function ErrorState({
  error,
  onRetry,
  compact = false,
  title = t('error.title'),
}: {
  error: unknown
  onRetry?: () => void
  compact?: boolean
  title?: string
}) {
  const problem = isProblemError(error) ? error : null
  const detail = problem?.detail ?? (error instanceof Error ? error.message : String(error))

  return (
    <div
      role="alert"
      className={cx(
        'rounded-[var(--radius-md)] border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)]',
        compact ? 'p-3' : 'p-5',
      )}
    >
      <div className="flex items-start gap-2.5">
        <SeverityIcon severity="error" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {problem?.title ?? title}
          </h3>
          <p className="mt-1 text-xs leading-[var(--leading-body)] text-[var(--text-secondary)]">
            {detail}
          </p>
          {problem && problem.errors.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {problem.errors.map((entry, index) => (
                <li
                  key={`${entry.field}-${index}`}
                  className="text-xs text-[var(--text-secondary)]"
                >
                  <span className="font-[family-name:var(--font-mono)] text-[var(--text-muted)]">
                    {entry.field}
                  </span>
                  {' - '}
                  {entry.message}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && (
              <Button
                size="sm"
                onClick={onRetry}
                icon={<RefreshCw className="size-3.5" aria-hidden />}
              >
                {t('common.retry')}
              </Button>
            )}
            {problem && (
              <CopyButton
                value={problem.toReport()}
                label={t('common.copyDetails')}
                withLabel
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** The full-page variant, used as a route error boundary. */
export function RouteErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <ErrorState error={error} onRetry={onRetry} title={t('error.route')} />
        <div className="mt-3 text-center">
          <Link to="/applications" className="text-xs text-[var(--color-primary)] hover:underline">
            {t('nav.applications')}
          </Link>
        </div>
      </div>
    </div>
  )
}
