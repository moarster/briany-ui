// The viewer class is exported as `Form`; aliased for readability at the call sites.
import { Form as FormViewer } from '@bpmn-io/form-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  assignTaskMutation,
  claimTaskMutation,
  completeTaskMutation,
  getCurrentUserOptions,
  getTaskFormOptions,
  getTaskOptions,
  hasCode,
  invalidate,
  isProblemError,
  listProcessInstanceVariablesOptions,
  unclaimTaskMutation,
} from '../../api'
import { BpmnViewer } from '../processes/BpmnViewer'
import { useProcessXml } from '../processes/useProcessXml'
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  JsonViewer,
  KeyValueEditor,
  RelativeTime,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '../../design/components'
import { fromVariableMap, toVariableMap } from '../../design/components/KeyValueEditor'
import type { VariableEntry } from '../../design/components/KeyValueEditor'
import { t } from '../../lib/i18n'
import '../../design/vendor/form.css'

/**
 * The task detail pane. Completing is optimistic - the task leaves the queue immediately
 * and the next one is selected, rolling back on failure. That single detail is what makes
 * a worklist feel fast.
 */
export function TaskDetail({
  taskId,
  onCompleted,
}: {
  taskId: string
  /** Selects the next task in the queue once this one is gone. */
  onCompleted: () => void
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('form')
  const [assigning, setAssigning] = useState(false)
  const [assignee, setAssignee] = useState('')
  const [variables, setVariables] = useState<VariableEntry[]>([])

  const formRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)

  const { data: me } = useQuery({ ...getCurrentUserOptions(), staleTime: Number.POSITIVE_INFINITY })
  const taskQuery = useQuery({ ...getTaskOptions({ path: { id: taskId } }), staleTime: 0 })
  const formQuery = useQuery({
    ...getTaskFormOptions({ path: { id: taskId } }),
    staleTime: 0,
    // A task with no formKey answers 404 with TASK_HAS_NO_FORM. That is a documented
    // shape, not a failure, so it must not be retried.
    retry: false,
  })

  const task = taskQuery.data
  const noForm = hasCode(formQuery.error, 'TASK_HAS_NO_FORM') || formQuery.error !== null
  const completed = task?.state === 'completed'

  const instanceVariables = useQuery({
    ...listProcessInstanceVariablesOptions({ path: { id: task?.processInstanceId ?? '' } }),
    enabled: Boolean(task?.processInstanceId),
    staleTime: 0,
  })

  const xmlQuery = useProcessXml(tab === 'process' ? (task?.processDefinitionKey ?? '') : '')

  // The raw-variables fallback is seeded from the process variables in scope, so the
  // operator is not retyping values the instance already holds. Adjusted during render, and
  // only once per arrival of the data, so it never overwrites what has been typed since.
  const [seededFrom, setSeededFrom] = useState<unknown>(undefined)
  if (noForm && instanceVariables.data !== undefined && seededFrom !== instanceVariables.data) {
    setSeededFrom(instanceVariables.data)
    if (variables.length === 0 && instanceVariables.data.length > 0) {
      setVariables(
        fromVariableMap(
          Object.fromEntries(instanceVariables.data.map((entry) => [entry.name, entry.value])),
        ),
      )
    }
  }

  useEffect(() => {
    const container = formRef.current
    const form = formQuery.data
    if (!container || !form) return

    const viewer = new FormViewer({ container })
    viewerRef.current = viewer
    void viewer.importSchema(form.form.schema, form.variables ?? {}).then(() => {
      // A completed task is a read-only record of what was submitted.
      if (completed)
        container.querySelectorAll('input, textarea, select, button').forEach((element) => {
          ;(element as HTMLInputElement).disabled = true
        })
    })

    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [formQuery.data, completed])

  const claim = useMutation({
    ...claimTaskMutation(),
    onSuccess: async () => {
      await invalidate.task(queryClient, taskId)
      toast.success('Task assigned to you.')
    },
    onError: (error) =>
      toast.error(isProblemError(error) ? error.detail : 'The task could not be claimed.'),
  })

  const unclaim = useMutation({
    ...unclaimTaskMutation(),
    onSuccess: async () => {
      await invalidate.task(queryClient, taskId)
      toast.success('Task unassigned.')
    },
    onError: (error) =>
      toast.error(isProblemError(error) ? error.detail : 'The task could not be unassigned.'),
  })

  const assign = useMutation({
    ...assignTaskMutation(),
    onSuccess: async () => {
      await invalidate.task(queryClient, taskId)
      setAssigning(false)
      setAssignee('')
      toast.success('Task assigned.')
    },
    onError: (error) =>
      toast.error(isProblemError(error) ? error.detail : 'The task could not be assigned.'),
  })

  const complete = useMutation({
    ...completeTaskMutation(),
    onMutate: () => {
      // Optimistic: the task leaves the queue before the server confirms, and the next one
      // is selected. Rolled back below if the completion fails.
      onCompleted()
    },
    onSuccess: async () => {
      await invalidate.tasks(queryClient)
      if (task?.processInstanceId) {
        await invalidate.processInstance(queryClient, task.processInstanceId)
      }
      toast.success('Task completed.')
    },
    onError: async (error) => {
      await invalidate.task(queryClient, taskId)
      toast.error(isProblemError(error) ? error.detail : 'The task could not be completed.')
    },
  })

  const submit = () => {
    const viewer = viewerRef.current
    if (viewer) {
      const { data, errors } = viewer.submit() as {
        data: Record<string, unknown>
        errors: Record<string, string[]>
      }
      if (Object.keys(errors).length > 0) {
        toast.error('Fix the highlighted fields before completing this task.')
        return
      }
      // Only the variables the form binds are sent, taken from Form.variables rather than
      // the whole data object, so completing does not overwrite unrelated state.
      const bound = formQuery.data?.form.variables ?? Object.keys(data)
      const payload = Object.fromEntries(
        bound.filter((name) => name in data).map((name) => [name, data[name]]),
      )
      complete.mutate({ path: { id: taskId }, body: { variables: payload } })
      return
    }

    complete.mutate({ path: { id: taskId }, body: { variables: toVariableMap(variables) } })
  }

  const scopedVariables = useMemo(() => instanceVariables.data ?? [], [instanceVariables.data])

  if (taskQuery.isError) {
    return (
      <div className="p-4">
        <ErrorState error={taskQuery.error} onRetry={() => void taskQuery.refetch()} />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const mine = task.assignee?.id === me?.id

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--border-default)] px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-md font-semibold text-[var(--text-primary)]">
            {task.name ?? task.taskDefinitionKey ?? task.id}
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
            {task.processInstanceId && (
              <Link
                to="/processes/instances/$id"
                params={{ id: task.processInstanceId }}
                className="flex items-center gap-1 text-[var(--color-primary)] hover:underline"
              >
                {task.processDefinitionName ?? task.processDefinitionKey ?? 'Process instance'}
                <ExternalLink className="size-3" aria-hidden />
              </Link>
            )}
            {task.processBusinessKey && (
              <span className="font-[family-name:var(--font-mono)]">{task.processBusinessKey}</span>
            )}
            <span>
              created <RelativeTime value={task.createdAt} />
            </span>
            {task.dueAt && (
              <span>
                due <RelativeTime value={task.dueAt} />
              </span>
            )}
          </div>
        </div>

        {!completed && (
          <div className="flex shrink-0 items-center gap-2">
            {mine ? (
              <Button
                size="sm"
                loading={unclaim.isPending}
                onClick={() => unclaim.mutate({ path: { id: taskId } })}
              >
                {t('tasks.unassign')}
              </Button>
            ) : (
              <Button
                size="sm"
                loading={claim.isPending}
                onClick={() => claim.mutate({ path: { id: taskId } })}
              >
                {t('tasks.assignToMe')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setAssigning(true)}>
              {t('tasks.assignTo')}
            </Button>
            <Button size="sm" variant="primary" loading={complete.isPending} onClick={submit}>
              {t('tasks.complete')}
            </Button>
          </div>
        )}
      </header>

      <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1">
        <TabList>
          <Tab value="form">{t('tasks.form')}</Tab>
          <Tab value="variables" count={scopedVariables.length}>
            {t('processes.variables')}
          </Tab>
          <Tab value="process">{t('tasks.process')}</Tab>
        </TabList>

        <TabPanel value="form" className="overflow-auto p-4">
          {formQuery.isLoading && <Skeleton className="h-64" />}

          {formQuery.data && <div ref={formRef} className="max-w-2xl" />}

          {noForm && !formQuery.isLoading && (
            <div className="max-w-2xl">
              <div className="mb-3">
                <h2 className="text-sm font-medium text-[var(--text-primary)]">
                  {t('tasks.noForm')}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{t('tasks.noFormDetail')}</p>
              </div>
              <KeyValueEditor entries={variables} onChange={setVariables} readOnly={completed} />
            </div>
          )}
        </TabPanel>

        <TabPanel value="variables" className="overflow-auto p-4">
          {scopedVariables.length === 0 ? (
            <EmptyState
              title="No variables"
              detail="This process instance holds no variables in scope for this task."
            />
          ) : (
            <dl className="grid max-w-3xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs">
              {scopedVariables.map((variable) => (
                <div key={`${variable.name}-${variable.executionId ?? ''}`} className="contents">
                  <dt className="font-[family-name:var(--font-mono)] text-[var(--text-primary)]">
                    {variable.name}
                  </dt>
                  <dd className="min-w-0 text-[var(--text-secondary)]">
                    {variable.value === null || typeof variable.value !== 'object' ? (
                      <span className="break-all">{String(variable.value)}</span>
                    ) : (
                      <JsonViewer value={variable.value} />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </TabPanel>

        <TabPanel value="process" className="min-h-0">
          {/* The same decorated viewer the instance page uses, with this task's element
              selected. Reused, not reimplemented. */}
          <BpmnViewer
            xml={xmlQuery.data}
            selectedActivityId={task.taskDefinitionKey}
            activities={
              task.taskDefinitionKey
                ? [
                    {
                      id: task.id,
                      activityId: task.taskDefinitionKey,
                      activityType: 'userTask',
                      state: completed ? 'completed' : 'active',
                    },
                  ]
                : []
            }
            className="h-full"
          />
        </TabPanel>
      </Tabs>

      <Dialog
        open={assigning}
        onOpenChange={setAssigning}
        title="Assign this task"
        description="There is no user directory API yet, so the id is entered directly and the server validates it."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssigning(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={assignee.trim() === ''}
              loading={assign.isPending}
              onClick={() =>
                assign.mutate({ path: { id: taskId }, body: { userId: assignee.trim() } })
              }
            >
              Assign
            </Button>
          </>
        }
      >
        <Field label="User id" htmlFor="assignee" required>
          <Input
            id="assignee"
            mono
            autoFocus
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
          />
        </Field>
      </Dialog>
    </div>
  )
}
