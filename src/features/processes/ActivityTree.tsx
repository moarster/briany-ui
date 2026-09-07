import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { ActivityNode } from '../../modeling/bpmn/overlays'
import { ActivityStatePill, Duration, Tooltip } from '../../design/components'
import { cx } from '../../lib/cx'

/**
 * The instance history as a tree, not a flat log, nested by sub-process containment.
 *
 * This is also the keyboard-navigable equivalent of the diagram: the BPMN canvas is not
 * accessible on its own, so this panel has to stay functionally complete.
 */
export function ActivityTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: ActivityNode[]
  selectedId?: string
  onSelect: (activityId: string) => void
}) {
  return (
    <ul role="tree" aria-label="Instance history" className="flex flex-col">
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </ul>
  )
}

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: ActivityNode
  depth: number
  selectedId?: string
  onSelect: (activityId: string) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0
  const selected = node.activityId === selectedId

  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={selected}>
      <div
        className={cx(
          'flex items-center gap-1.5 rounded-[var(--radius-sm)] py-1 pr-2 text-xs',
          selected ? 'bg-[var(--color-primary-soft)]' : 'hover:bg-[var(--surface-2)]',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => setOpen((current) => !current)}
            className="shrink-0 text-[var(--text-muted)]"
          >
            {open ? (
              <ChevronDown className="size-3" aria-hidden />
            ) : (
              <ChevronRight className="size-3" aria-hidden />
            )}
          </button>
        ) : (
          <span className="w-3 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          onClick={() => onSelect(node.activityId)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Tooltip content={node.activityType}>
            <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
              {node.activityName ?? node.activityId}
            </span>
          </Tooltip>
          <ActivityStatePill state={node.state} />
          <Duration
            millis={node.durationInMillis}
            className="w-14 shrink-0 text-right text-2xs text-[var(--text-muted)]"
          />
        </button>
      </div>

      {hasChildren && open && (
        <ul role="group" className="flex flex-col">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
