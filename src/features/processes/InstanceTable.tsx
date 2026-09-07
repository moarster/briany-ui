import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useMemo } from 'react'
import {
  RUNTIME_STALE_TIME,
  listProcessInstancesOptions,
  listProcessProcessInstancesOptions,
  pollWhileVisible,
} from '../../api'
import type { ProcessInstance, ProcessInstancePage, ProcessInstanceState } from '../../api'
import {
  DataTable,
  Duration,
  EmptyState,
  ErrorState,
  Identifier,
  InstanceStatePill,
  Pagination,
  RelativeTime,
} from '../../design/components'
import { InstanceActions } from './InstanceActions'

const PAGE_SIZE = 50

const columnHelper = createColumnHelper<ProcessInstance>()

/**
 * The instance table, shared by the instance list and the definition detail's Instances
 * tab. Polls every 5s, but only while the tab is visible and only while something on the
 * page is actually running.
 */
export function InstanceTable({
  state,
  processDefinitionKey,
  page,
  onPageChange,
  filterText,
}: {
  state?: ProcessInstanceState
  processDefinitionKey?: string
  page: number
  onPageChange: (page: number) => void
  /** Client-side over the loaded page: instance id and business key. */
  filterText?: string
}) {
  const navigate = useNavigate()

  // Scoping to a definition is its own operation in the contract rather than a query
  // parameter on the global list, so the two are selected here instead of the caller
  // knowing which endpoint applies.
  const options = (
    processDefinitionKey === undefined || processDefinitionKey === ''
      ? listProcessInstancesOptions({ query: { page, size: PAGE_SIZE, state } })
      : listProcessProcessInstancesOptions({
          path: { key: processDefinitionKey },
          query: { page, size: PAGE_SIZE, state },
        })
  ) as UseQueryOptions<ProcessInstancePage, Error, ProcessInstancePage, readonly unknown[]>

  const query = useQuery({
    ...options,
    staleTime: RUNTIME_STALE_TIME,
    // Polls only while the tab is visible and only while something on the page is
    // actually running: a page of completed instances has nothing to refresh.
    refetchInterval: (query) => {
      const running = (query.state.data?.data ?? []).some(
        (instance) => instance.state === 'running',
      )
      return pollWhileVisible(running)()
    },
    // Keeps the table populated across pagination and filtering rather than blanking it.
    placeholderData: keepPreviousData,
  })

  const rows = useMemo(() => {
    const instances = query.data?.data ?? []
    const needle = filterText?.trim().toLowerCase()
    if (!needle) return instances
    return instances.filter(
      (instance) =>
        instance.id.toLowerCase().includes(needle) ||
        (instance.businessKey ?? '').toLowerCase().includes(needle),
    )
  }, [query.data, filterText])

  const columns = useMemo(
    () => [
      columnHelper.accessor('state', {
        header: 'State',
        size: 120,
        cell: (info) => <InstanceStatePill state={info.getValue()} />,
      }),
      columnHelper.accessor(
        (row) => row.name ?? row.processDefinition?.name ?? row.processDefinition?.key,
        {
          id: 'name',
          header: 'Process',
          cell: (info) => (
            <span className="text-[var(--text-primary)]">{info.getValue() ?? '-'}</span>
          ),
        },
      ),
      columnHelper.accessor('businessKey', {
        header: 'Business key',
        size: 160,
        cell: (info) =>
          info.getValue() ? (
            <span className="font-[family-name:var(--font-mono)] text-xs">{info.getValue()}</span>
          ) : (
            <span className="text-[var(--text-muted)]">-</span>
          ),
      }),
      columnHelper.accessor('id', {
        header: 'Instance',
        size: 150,
        cell: (info) => <Identifier value={info.getValue()} keep={6} />,
      }),
      columnHelper.accessor((row) => row.processDefinition?.version, {
        id: 'version',
        header: 'Version',
        size: 80,
        cell: (info) => (
          <span className="tabular">{info.getValue() ? `v${info.getValue()}` : '-'}</span>
        ),
      }),
      columnHelper.accessor('startTime', {
        header: 'Started',
        size: 120,
        cell: (info) => <RelativeTime value={info.getValue()} />,
      }),
      columnHelper.accessor('durationInMillis', {
        header: 'Duration',
        size: 100,
        cell: (info) => <Duration millis={info.getValue()} />,
      }),
      columnHelper.accessor('startUserId', {
        header: 'Started by',
        size: 120,
        cell: (info) => info.getValue() ?? <span className="text-[var(--text-muted)]">-</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 60,
        cell: (info) => (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <InstanceActions instance={info.row.original} />
          </div>
        ),
      }),
    ],
    [],
  )

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })

  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable
        table={table}
        loading={query.isFetching}
        className="flex-1"
        onRowClick={(instance) =>
          void navigate({ to: '/processes/instances/$id', params: { id: instance.id } })
        }
        empty={
          <EmptyState
            title="No instances"
            detail={
              state
                ? 'Nothing matches this filter. Widen it, or start an instance from a definition.'
                : 'Nothing has run yet. Start an instance from a process definition.'
            }
          />
        }
      />
      {query.data && query.data.totalPages > 1 && (
        <Pagination
          page={query.data.page}
          pageSize={query.data.pageSize}
          totalElements={query.data.totalElements}
          hasNext={query.data.hasNext}
          hasPrevious={query.data.hasPrevious}
          onPageChange={onPageChange}
          unit="instance"
        />
      )}
    </div>
  )
}
