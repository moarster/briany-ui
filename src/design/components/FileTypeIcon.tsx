import { GitBranch, Table2, TextCursorInput } from 'lucide-react'
import type { ModelerFileType } from '../../api'
import { cx } from '../../lib/cx'

/**
 * Type identity is an icon colour and it is the same everywhere in the product. It never
 * encodes state - that is what the state chip is for.
 */
const types = {
  bpmn: { Icon: GitBranch, color: 'text-[var(--type-process)]', label: 'Process' },
  dmn: { Icon: Table2, color: 'text-[var(--type-decision)]', label: 'Decision' },
  bform: { Icon: TextCursorInput, color: 'text-[var(--type-form)]', label: 'Form' },
} as const

export const FILE_TYPE_LABEL: Record<ModelerFileType, string> = {
  bpmn: 'Process',
  dmn: 'Decision',
  bform: 'Form',
}

export function FileTypeIcon({
  type,
  className,
  decorative = false,
}: {
  type: ModelerFileType
  className?: string
  decorative?: boolean
}) {
  const { Icon, color, label } = types[type]
  return (
    <Icon
      className={cx('size-4 shrink-0', color, className)}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
    />
  )
}
