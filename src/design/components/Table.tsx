import { flexRender } from '@tanstack/react-table'
import type { Table as TanstackTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { TableSkeleton } from './states'

/**
 * The one table in the product. Dense by default (`--row-height`), sticky header, and
 * opaque - tables are working surfaces and never take the glass treatment.
 */
export function DataTable<T>({
  table,
  loading = false,
  empty,
  onRowClick,
  rowIsSelected,
  className,
}: {
  table: TanstackTable<T>
  loading?: boolean
  empty?: ReactNode
  onRowClick?: (row: T) => void
  rowIsSelected?: (row: T) => boolean
  className?: string
}) {
  const rows = table.getRowModel().rows
  const columnCount = table.getAllLeafColumns().length

  if (loading && rows.length === 0) return <TableSkeleton columns={columnCount} />
  if (!loading && rows.length === 0 && empty) return <>{empty}</>

  return (
    <div className={cx('relative min-h-0 overflow-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-[var(--z-sticky)] bg-[var(--surface-1)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[var(--border-default)]">
              {headerGroup.headers.map((header) => {
                const sortable = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                return (
                  <th
                    key={header.id}
                    scope="col"
                    style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}
                    className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-wide text-[var(--text-muted)]"
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                    }
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-[var(--text-primary)]"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ArrowUp className="size-3" aria-hidden />
                        ) : sorted === 'desc' ? (
                          <ArrowDown className="size-3" aria-hidden />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = rowIsSelected?.(row.original) ?? false
            return (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter') onRowClick(row.original)
                      }
                    : undefined
                }
                aria-selected={onRowClick ? selected : undefined}
                className={cx(
                  'h-[var(--row-height)] border-b border-[var(--border-subtle)]',
                  onRowClick && 'cursor-pointer hover:bg-[var(--surface-2)]',
                  selected && 'bg-[var(--color-primary-soft)]',
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-1 align-middle text-[var(--text-secondary)]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {/* A refetch is an inline bar, never a spinner that blanks the data already shown. */}
      {loading && rows.length > 0 && (
        <div
          role="status"
          aria-label="Refreshing"
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 animate-pulse bg-[var(--color-primary)]"
        />
      )}
    </div>
  )
}
