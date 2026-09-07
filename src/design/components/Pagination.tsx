import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pluralise } from '../../lib/format'
import { IconButton } from './IconButton'

export function Pagination({
  page,
  pageSize,
  totalElements,
  hasNext,
  hasPrevious,
  onPageChange,
  unit = 'item',
}: {
  page: number
  pageSize: number
  totalElements: number
  hasNext: boolean
  hasPrevious: boolean
  onPageChange: (page: number) => void
  unit?: string
}) {
  const first = totalElements === 0 ? 0 : page * pageSize + 1
  const last = Math.min((page + 1) * pageSize, totalElements)

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--border-default)] px-3 py-1.5">
      <p className="tabular text-xs text-[var(--text-muted)]">
        {first}-{last} of {pluralise(totalElements, unit)}
      </p>
      <div className="flex items-center gap-1">
        <IconButton
          label="Previous page"
          disabled={!hasPrevious}
          onClick={() => onPageChange(page - 1)}
          icon={<ChevronLeft className="size-4" aria-hidden />}
        />
        <IconButton
          label="Next page"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          icon={<ChevronRight className="size-4" aria-hidden />}
        />
      </div>
    </div>
  )
}
