import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckSquare } from 'lucide-react'
import { useMemo } from 'react'
import { RUNTIME_STALE_TIME, listTasksOptions, pollWhileVisible } from '../../../api'
import {
  TASK_FILTERS,
  TASK_SORTS,
  resolveFilter,
  tasksSearchSchema,
} from '../../../features/tasks/filters'
import { TaskDetail } from '../../../features/tasks/TaskDetail'
import { TaskQueue } from '../../../features/tasks/TaskQueue'
import { Button, EmptyState, ErrorState, Input, Select, Skeleton } from '../../../design/components'
import { cx } from '../../../lib/cx'
import { t } from '../../../lib/i18n'
import { TopBar } from '../../shell/TopBar'

export const Route = createFileRoute('/_authenticated/tasks/')({
  validateSearch: tasksSearchSchema,
  component: TasksPage,
})

function TasksPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filter = resolveFilter(search.filter)

  const query = useQuery({
    ...listTasksOptions({
      query: {
        state: filter.state,
        assignment: filter.assignment,
        nameLike: search.q || undefined,
        sort: [search.sort],
        size: 50,
      },
    }),
    staleTime: RUNTIME_STALE_TIME,
    refetchInterval: pollWhileVisible(filter.state === 'active'),
  })

  const tasks = useMemo(() => query.data?.data ?? [], [query.data])

  // Keeps a selection valid across refetches, and selects the first task when the URL
  // carries none - a worklist that opens on nothing wastes a click every time.
  const selectedId = useMemo(() => {
    if (search.taskId && tasks.some((task) => task.id === search.taskId)) return search.taskId
    return tasks[0]?.id
  }, [search.taskId, tasks])

  const select = (taskId: string | undefined) => {
    void navigate({ search: (current) => ({ ...current, taskId }), replace: true })
  }

  const selectNext = () => {
    const index = tasks.findIndex((task) => task.id === selectedId)
    select(tasks[index + 1]?.id ?? tasks[index - 1]?.id)
  }

  return (
    <>
      <TopBar
        crumbs={[{ label: t('tasks.title') }]}
        actions={
          <Button variant="secondary" onClick={() => void navigate({ to: '/tasks/start' })}>
            Start a process
          </Button>
        }
      />

      <main className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r border-[var(--border-default)]">
          <nav aria-label="Task filters" className="flex flex-col gap-0.5 p-2">
            {TASK_FILTERS.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-current={search.filter === candidate.id ? 'true' : undefined}
                onClick={() =>
                  void navigate({
                    search: (current) => ({ ...current, filter: candidate.id, taskId: undefined }),
                  })
                }
                className={cx(
                  'rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs transition-colors',
                  search.filter === candidate.id
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]',
                )}
              >
                {candidate.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-col gap-2 border-y border-[var(--border-default)] p-2">
            <Input
              value={search.q ?? ''}
              placeholder="Search task names"
              aria-label="Search task names"
              onChange={(event) =>
                void navigate({
                  search: (current) => ({ ...current, q: event.target.value || undefined }),
                })
              }
            />
            <Select
              aria-label="Sort"
              value={search.sort}
              onValueChange={(sort) =>
                void navigate({ search: (current) => ({ ...current, sort }) })
              }
              options={TASK_SORTS.map((sort) => ({ value: sort.value, label: sort.label }))}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {query.isLoading && (
              <div className="flex flex-col gap-1 p-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="h-14" />
                ))}
              </div>
            )}
            {query.isError && (
              <div className="p-2">
                <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
              </div>
            )}
            {query.isSuccess && tasks.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">
                No tasks match this filter.
              </p>
            )}
            <TaskQueue tasks={tasks} selectedId={selectedId} onSelect={select} />
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {selectedId ? (
            <TaskDetail key={selectedId} taskId={selectedId} onCompleted={selectNext} />
          ) : (
            <EmptyState
              icon={<CheckSquare className="size-7" aria-hidden />}
              title="Nothing to work on"
              detail="A task appears here when a running process reaches a user task you can see. Start a process, or widen the filter."
              action={
                <Button variant="primary" onClick={() => void navigate({ to: '/tasks/start' })}>
                  Start a process
                </Button>
              }
            />
          )}
        </section>
      </main>
    </>
  )
}
