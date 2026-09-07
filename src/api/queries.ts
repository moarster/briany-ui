import type { Query, QueryClient, QueryKey } from '@tanstack/react-query'
import {
  getModelerAppQueryKey,
  getProcessInstanceQueryKey,
  getTaskQueryKey,
  listModelerAppFilesQueryKey,
} from './generated/@tanstack/react-query.gen'

/**
 * Query conventions. Keys always come from the generated `queryOptions`; nothing in this
 * application invents a parallel key space.
 *
 * A generated key is `[{ _id: '<operationId>', baseUrl, path?, query? }]`, so an exact
 * key invalidates one request and `byOperation` invalidates every variant of an
 * operation regardless of its parameters.
 */

/** Catalogue data: applications, definitions, forms. Cheap to serve, slow to change. */
export const CATALOGUE_STALE_TIME = 30_000

/** Runtime data: instances, tasks. Always refetched. */
export const RUNTIME_STALE_TIME = 0

export const RUNTIME_POLL_INTERVAL = 5_000

/**
 * Polls a runtime list, but only while the tab is visible. A hidden tab polling a work
 * list is load the operator never sees.
 */
export function pollWhileVisible(enabled = true) {
  return () => (enabled && !document.hidden ? RUNTIME_POLL_INTERVAL : (false as const))
}

type GeneratedKeyHead = { _id?: string }

/** Matches every cached query for the named operations, whatever their parameters. */
export function byOperation(...operationIds: string[]) {
  const wanted = new Set(operationIds)
  return (query: Query<unknown, Error, unknown, QueryKey>) => {
    const head = query.queryKey[0] as GeneratedKeyHead | undefined
    return typeof head?._id === 'string' && wanted.has(head._id)
  }
}

/** The narrowest invalidation each mutation can get away with. */
export const invalidate = {
  modelerApps: (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ predicate: byOperation('listModelerApps') }),

  modelerApp: (queryClient: QueryClient, key: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getModelerAppQueryKey({ path: { key } }) }),
      queryClient.invalidateQueries({ queryKey: listModelerAppFilesQueryKey({ path: { key } }) }),
      queryClient.invalidateQueries({ predicate: byOperation('listModelerApps') }),
    ]),

  /**
   * A deploy changes the workspace, the definitions it produced and the forms it
   * published, so all three caches have to go.
   */
  afterDeploy: (queryClient: QueryClient, key: string) =>
    Promise.all([
      invalidate.modelerApp(queryClient, key),
      queryClient.invalidateQueries({
        predicate: byOperation(
          'listProcesses',
          'getProcess',
          'listProcessDefinitionVersions',
          'listForms',
          'listApplications',
        ),
      }),
    ]),

  processInstances: (queryClient: QueryClient) =>
    queryClient.invalidateQueries({
      predicate: byOperation(
        'listProcessInstances',
        'listProcessProcessInstances',
        'listProcessDefinitionVersionInstances',
      ),
    }),

  processInstance: (queryClient: QueryClient, id: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getProcessInstanceQueryKey({ path: { id } }) }),
      queryClient.invalidateQueries({
        predicate: byOperation('listProcessInstanceActivities', 'listProcessInstanceVariables'),
      }),
    ]),

  tasks: (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ predicate: byOperation('listTasks') }),

  task: (queryClient: QueryClient, id: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getTaskQueryKey({ path: { id } }) }),
      queryClient.invalidateQueries({ predicate: byOperation('listTasks', 'getTaskForm') }),
    ]),
}
