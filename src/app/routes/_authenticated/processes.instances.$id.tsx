import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { useMemo } from 'react'
import { z } from 'zod'
import {
  RUNTIME_STALE_TIME,
  getProcessInstanceOptions,
  listProcessInstanceActivitiesOptions,
  listProcessInstanceVariablesOptions,
  pollWhileVisible,
} from '../../../api'
import { ActivityTree } from '../../../features/processes/ActivityTree'
import { BpmnViewer } from '../../../features/processes/BpmnViewer'
import { InstanceActions } from '../../../features/processes/InstanceActions'
import { useProcessXml } from '../../../features/processes/useProcessXml'
import { buildActivityTree } from '../../../modeling/bpmn/overlays'
import {
  Duration,
  ErrorState,
  Identifier,
  InstanceStatePill,
  JsonViewer,
  RelativeTime,
  SeverityIcon,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '../../../design/components'
import { t } from '../../../lib/i18n'
import { TopBar } from '../../shell/TopBar'

const searchSchema = z.object({
  /** The selected BPMN element. Links the tree, the diagram and the variables together. */
  activity: z.string().optional(),
  tab: z.enum(['details', 'variables']).default('details'),
})

export const Route = createFileRoute('/_authenticated/processes/instances/$id')({
  validateSearch: searchSchema,
  component: InstancePage,
})

function InstancePage() {
  const { id } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const instanceQuery = useQuery({
    ...getProcessInstanceOptions({ path: { id } }),
    staleTime: RUNTIME_STALE_TIME,
    refetchInterval: (query) => pollWhileVisible(query.state.data?.state === 'running')(),
  })
  const activitiesQuery = useQuery({
    ...listProcessInstanceActivitiesOptions({ path: { id } }),
    staleTime: RUNTIME_STALE_TIME,
    refetchInterval: (query) =>
      pollWhileVisible((query.state.data ?? []).some((activity) => activity.state === 'active'))(),
  })
  const variablesQuery = useQuery({
    ...listProcessInstanceVariablesOptions({ path: { id } }),
    staleTime: RUNTIME_STALE_TIME,
  })

  const instance = instanceQuery.data
  const definitionKey = instance?.processDefinition?.key ?? ''
  const xmlQuery = useProcessXml(definitionKey)

  const activities = useMemo(() => activitiesQuery.data ?? [], [activitiesQuery.data])
  const tree = useMemo(() => buildActivityTree(activities), [activities])

  const variables = useMemo(() => {
    const all = variablesQuery.data ?? []
    if (!search.activity) return all
    // Selecting a node filters the variables to that scope, which is the whole point of
    // making the diagram and the tree the same selection.
    const scoped = activities.filter((activity) => activity.activityId === search.activity)
    const executionIds = new Set(scoped.map((activity) => activity.executionId))
    const taskIds = new Set(scoped.map((activity) => activity.taskId))
    return all.filter(
      (variable) =>
        variable.scope === 'global' ||
        (variable.executionId !== undefined && executionIds.has(variable.executionId)) ||
        (variable.taskId !== undefined && taskIds.has(variable.taskId)),
    )
  }, [variablesQuery.data, activities, search.activity])

  const select = (activityId: string) => {
    void navigate({
      search: (current) => ({
        ...current,
        activity: current.activity === activityId ? undefined : activityId,
      }),
      replace: true,
    })
  }

  /**
   * Be honest about failures. Incident detail is not modelled yet (contract iteration 2),
   * so a stalled instance must not render as a healthy one: name the activity execution
   * stopped at, and say plainly what is not available.
   */
  const stalled =
    instance?.state === 'running' &&
    activities.length > 0 &&
    activities.every((activity) => activity.state !== 'active')

  if (instanceQuery.isError) {
    return (
      <>
        <TopBar
          crumbs={[
            { label: t('processes.title'), to: '/processes' },
            { label: t('processes.instances'), to: '/processes/instances' },
            { label: id },
          ]}
        />
        <main className="p-4">
          <ErrorState error={instanceQuery.error} onRetry={() => void instanceQuery.refetch()} />
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar
        crumbs={[
          { label: t('processes.title'), to: '/processes' },
          { label: t('processes.instances'), to: '/processes/instances' },
          { label: instance?.businessKey ?? id },
        ]}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--border-default)] px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-md font-semibold text-[var(--text-primary)]">
                {instance?.name ?? instance?.processDefinition?.name ?? (definitionKey || id)}
              </h1>
              {instance && <InstanceStatePill state={instance.state} />}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                instance <Identifier value={id} keep={8} />
              </span>
              {instance?.businessKey && (
                <span className="font-[family-name:var(--font-mono)]">{instance.businessKey}</span>
              )}
              {definitionKey && (
                <Link
                  to="/processes/$key"
                  params={{ key: definitionKey }}
                  className="flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                >
                  {definitionKey}
                  {instance?.processDefinition?.version &&
                    ` v${instance.processDefinition.version}`}
                  <ExternalLink className="size-3" aria-hidden />
                </Link>
              )}
              <span>
                started <RelativeTime value={instance?.startTime} />
              </span>
              {instance?.endTime && (
                <span>
                  ended <RelativeTime value={instance.endTime} />
                </span>
              )}
              <Duration millis={instance?.durationInMillis} />
            </div>
          </div>

          {instance && (
            <InstanceActions
              instance={instance}
              onDeleted={() => void navigate({ to: '/processes/instances' })}
            />
          )}
        </header>

        {stalled && (
          <div
            role="status"
            className="flex shrink-0 items-start gap-2 border-b border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)] px-4 py-2 text-xs"
          >
            <SeverityIcon severity="warning" className="mt-0.5" />
            <p className="text-[var(--text-secondary)]">
              This instance is running but no activity is active, so execution has stopped
              somewhere. The last activity it entered was{' '}
              <span className="font-[family-name:var(--font-mono)] text-[var(--text-primary)]">
                {activities[activities.length - 1]?.activityName ??
                  activities[activities.length - 1]?.activityId}
              </span>
              . Incident and dead-letter job detail is not exposed by the API yet, so the reason
              cannot be shown here - check the engine logs with the instance id above.
            </p>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-[3]">
            <aside className="w-72 shrink-0 overflow-y-auto border-r border-[var(--border-default)] p-2">
              <h2 className="mb-1.5 px-1 text-2xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {t('processes.history')}
              </h2>
              {activitiesQuery.isLoading ? (
                <Skeleton className="h-32" />
              ) : tree.length === 0 ? (
                <p className="px-1 text-xs text-[var(--text-muted)]">
                  No activity has been recorded for this instance yet.
                </p>
              ) : (
                <ActivityTree nodes={tree} selectedId={search.activity} onSelect={select} />
              )}
            </aside>

            <div className="min-w-0 flex-1">
              {/* Selection works in both directions: element click selects the tree node. */}
              <BpmnViewer
                xml={xmlQuery.data}
                activities={activities}
                selectedActivityId={search.activity}
                onElementClick={select}
                className="h-full"
              />
            </div>
          </div>

          <Tabs
            value={search.tab}
            onValueChange={(tab) =>
              void navigate({ search: (current) => ({ ...current, tab: tab as 'details' }) })
            }
            className="min-h-0 flex-[2] border-t border-[var(--border-default)]"
          >
            <TabList>
              <Tab value="details">Details</Tab>
              <Tab value="variables" count={variables.length}>
                {t('processes.variables')}
              </Tab>
            </TabList>

            <TabPanel value="details" className="overflow-auto p-4">
              <dl className="grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs">
                <Fact label="Instance id" value={<Identifier value={id} keep={12} />} />
                <Fact
                  label="Business key"
                  value={instance?.businessKey ?? <Muted>Not set</Muted>}
                />
                <Fact
                  label="Definition"
                  value={
                    instance?.processDefinition?.id ? (
                      <Identifier value={instance.processDefinition.id} keep={12} />
                    ) : (
                      <Muted>-</Muted>
                    )
                  }
                />
                <Fact label="Started by" value={instance?.startUserId ?? <Muted>-</Muted>} />
                <Fact label="Started" value={<RelativeTime value={instance?.startTime} />} />
                <Fact
                  label="Ended"
                  value={
                    instance?.endTime ? (
                      <RelativeTime value={instance.endTime} />
                    ) : (
                      <Muted>Still running</Muted>
                    )
                  }
                />
                <Fact label="Duration" value={<Duration millis={instance?.durationInMillis} />} />
              </dl>
            </TabPanel>

            <TabPanel value="variables" className="overflow-auto">
              {search.activity && (
                <p className="px-4 pt-3 text-xs text-[var(--text-muted)]">
                  Filtered to the scope of{' '}
                  <span className="font-[family-name:var(--font-mono)]">{search.activity}</span>{' '}
                  plus the global variables.
                </p>
              )}
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-[var(--surface-1)]">
                  <tr className="border-b border-[var(--border-default)]">
                    {['Name', 'Type', 'Value', 'Scope', 'Last updated'].map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-wide text-[var(--text-muted)]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variables.map((variable) => (
                    <tr
                      key={`${variable.name}-${variable.executionId ?? ''}`}
                      className="border-b border-[var(--border-subtle)] align-top"
                    >
                      <td className="px-3 py-1.5 font-[family-name:var(--font-mono)] text-[var(--text-primary)]">
                        {variable.name}
                      </td>
                      <td className="px-3 py-1.5 text-[var(--text-muted)]">
                        {variable.type ?? '-'}
                      </td>
                      <td className="max-w-md px-3 py-1.5">
                        {/* JSON values collapse rather than truncating to one useless line. */}
                        {isScalar(variable.value) ? (
                          <span className="break-all">{String(variable.value)}</span>
                        ) : (
                          <JsonViewer value={variable.value} />
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-[var(--text-muted)]">{variable.scope}</td>
                      <td className="px-3 py-1.5">
                        <RelativeTime value={variable.lastUpdatedTime ?? variable.createTime} />
                      </td>
                    </tr>
                  ))}
                  {variables.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-[var(--text-muted)]">
                        This instance holds no variables in the selected scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TabPanel>
          </Tabs>
        </div>
      </main>
    </>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="text-[var(--text-secondary)]">{value}</dd>
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--text-muted)]">{children}</span>
}

function isScalar(value: unknown): boolean {
  return value === null || typeof value !== 'object'
}
