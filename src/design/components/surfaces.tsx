import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

/** An opaque working surface: panels, file cards, detail columns. */
export function Card({
  children,
  className,
  interactive = false,
  as: Component = 'div',
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
  as?: 'div' | 'article' | 'section'
}) {
  return (
    <Component
      className={cx(
        'rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)]',
        interactive &&
          'transition-[border-color,box-shadow] duration-[var(--duration-1)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-2)]',
        className,
      )}
    >
      {children}
    </Component>
  )
}

/** Chrome and overlays only. Never wraps a table, a canvas, a form or a code editor. */
export function GlassPanel({
  children,
  className,
  as: Component = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'aside' | 'header' | 'article'
}) {
  return (
    <Component className={cx('glass rounded-[var(--radius-lg)]', className)}>{children}</Component>
  )
}

export type Crumb = { label: string; to?: string; params?: Record<string, string> }

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 items-center gap-1 text-xs">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && (
                <ChevronRight className="size-3 shrink-0 text-[var(--text-muted)]" aria-hidden />
              )}
              {item.to && !last ? (
                <Link
                  to={item.to}
                  params={item.params}
                  className="truncate text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={cx(
                    'truncate',
                    last ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** A section header inside a page: title on the left, controls on the right. */
export function SectionHeader({
  title,
  count,
  children,
  className,
}: {
  title: string
  count?: number
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2',
        className,
      )}
    >
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {title}
        {count !== undefined && <span className="tabular text-[var(--text-muted)]">({count})</span>}
      </h2>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
