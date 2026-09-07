import { AlertTriangle } from 'lucide-react'
import type { Task } from '../../api'
import { Avatar, Badge, RelativeTime, Tooltip } from '../../design/components'
import { cx } from '../../lib/cx'
import { toDate } from '../../lib/format'
import { useNow } from '../../lib/useNow'

/**
 * The queue item, carrying what an operator triages on: what the task is, which process it
 * came from, who has it, how urgent it is, and whether it is overdue.
 */
export function TaskQueue({
  tasks,
  selectedId,
  onSelect,
}: {
  tasks: Task[]
  selectedId?: string
  onSelect: (taskId: string) => void
}) {
  const now = useNow()

  return (
    <ul className="flex flex-col">
      {tasks.map((task) => {
        const selected = task.id === selectedId
        const due = toDate(task.dueAt)
        const overdue = due !== null && due.getTime() < now && task.state === 'active'

        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onSelect(task.id)}
              aria-current={selected ? 'true' : undefined}
              className={cx(
                'flex w-full flex-col gap-1 border-b border-[var(--border-subtle)] px-3 py-2 text-left',
                selected ? 'bg-[var(--color-primary-soft)]' : 'hover:bg-[var(--surface-2)]',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text-primary)]">
                  {task.name ?? task.taskDefinitionKey ?? task.id}
                </span>
                {task.priority !== 50 && (
                  <Badge tone={task.priority > 50 ? 'warning' : 'neutral'}>P{task.priority}</Badge>
                )}
              </div>

              <span className="truncate text-2xs text-[var(--text-muted)]">
                {task.processDefinitionName ?? task.processDefinitionKey ?? 'Unknown process'}
                {task.processBusinessKey && ` . ${task.processBusinessKey}`}
              </span>

              <div className="flex items-center justify-between gap-2 text-2xs text-[var(--text-muted)]">
                <span className="flex min-w-0 items-center gap-1.5">
                  {task.assignee ? (
                    <>
                      <Avatar size="sm" name={task.assignee.displayName ?? task.assignee.id} />
                      <span className="truncate">
                        {task.assignee.displayName ?? task.assignee.id}
                      </span>
                    </>
                  ) : (
                    <span className="italic">Unassigned</span>
                  )}
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  {due && (
                    <Tooltip content={overdue ? 'Overdue' : 'Due'}>
                      <span
                        className={cx(
                          'flex items-center gap-1 rounded-[var(--radius-full)] px-1.5',
                          overdue && 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
                        )}
                      >
                        {overdue && <AlertTriangle className="size-3" aria-hidden />}
                        <RelativeTime value={task.dueAt} />
                      </span>
                    </Tooltip>
                  )}
                  <RelativeTime value={task.createdAt} />
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
