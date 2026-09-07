import { z } from 'zod'
import type { TaskAssignmentFilter } from '../../api'

/** The four Tasklist filters, plus the one Tasklist lacks. */
export const TASK_FILTERS = [
  { id: 'open', label: 'All open', state: 'active', assignment: 'any' },
  { id: 'mine', label: 'Assigned to me', state: 'active', assignment: 'mine' },
  { id: 'unassigned', label: 'Unassigned', state: 'active', assignment: 'unassigned' },
  // Not in Camunda Tasklist, and the one that makes group-based work usable.
  { id: 'claimable', label: 'Available to claim', state: 'active', assignment: 'candidate' },
  { id: 'completed', label: 'Completed', state: 'completed', assignment: 'mine' },
] as const satisfies readonly {
  id: string
  label: string
  state: 'active' | 'completed'
  assignment: TaskAssignmentFilter
}[]

export type TaskFilterId = (typeof TASK_FILTERS)[number]['id']

export const taskFilterIds = TASK_FILTERS.map((filter) => filter.id) as [
  TaskFilterId,
  ...TaskFilterId[],
]

export function resolveFilter(id: TaskFilterId) {
  return TASK_FILTERS.find((filter) => filter.id === id) ?? TASK_FILTERS[0]
}

/** Follow-up date is not modelled by the contract, so it is deliberately not offered. */
export const TASK_SORTS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'dueAt,asc', label: 'Due date' },
  { value: 'priority,desc', label: 'Priority' },
] as const

export const tasksSearchSchema = z.object({
  filter: z.enum(taskFilterIds).default('open'),
  sort: z.string().default('createdAt,desc'),
  /** The selected task, so a task is linkable. */
  taskId: z.string().optional(),
  q: z.string().optional(),
})

export type TasksSearch = z.infer<typeof tasksSearchSchema>
