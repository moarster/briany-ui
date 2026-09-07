import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { FileText, Play, Workflow } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { CATALOGUE_STALE_TIME, listProcessesOptions } from '../../../api'
import type { ProcessDefinition } from '../../../api'
import { StartInstanceDialog } from '../../../features/processes/StartInstanceDialog'
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Identifier,
  Input,
  Pagination,
  Tooltip,
} from '../../../design/components'
import { t } from '../../../lib/i18n'
import { TopBar } from '../../shell/TopBar'

const searchSchema = z.object({
  q: z.string().optional(),
  page: z.number().int().min(0).default(0),
})

export const Route = createFileRoute('/_authenticated/processes/')({
  validateSearch: searchSchema,
  component: DefinitionsPage,
})

const PAGE_SIZE = 50
const columnHelper = createColumnHelper<ProcessDefinition>()

function DefinitionsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [sorting, setSorting] = useState<SortingState>([])
  const [starting, setStarting] = useState<ProcessDefinition | null>(null)

  const query = useQuery({
    ...listProcessesOptions({ query: { page: search.page, size: PAGE_SIZE, includeStats: true } }),
    staleTime: CATALOGUE_STALE_TIME,
  })

  const rows = useMemo(() => {
    const definitions = query.data?.data ?? []
    const needle = search.q?.trim().toLowerCase()
    if (!needle) return definitions
    return definitions.filter(
      (definition) =>
        definition.key.toLowerCase().includes(needle) ||
        (definition.name ?? '').toLowerCase().includes(needle),
    )
  }, [query.data, search.q])

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <div className="min-w-0">
            <p className="truncate text-[var(--text-primary)]">
              {info.getValue() ?? info.row.original.key}
            </p>
            <p className="truncate font-[family-name:var(--font-mono)] text-2xs text-[var(--text-muted)]">
              {info.row.original.key}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor('version', {
        header: 'Version',
        size: 90,
        cell: (info) => <Badge mono>v{info.getValue()}</Badge>,
      }),
      columnHelper.accessor((row) => row.stats?.running ?? 0, {
        id: 'instances',
        header: 'Instances',
        size: 200,
        cell: (info) => {
          const stats = info.row.original.stats
          if (!stats) return <span className="text-[var(--text-muted)]">-</span>
          return (
            <InstanceBar
              running={stats.running}
              completed={stats.completed}
              suspended={stats.suspended}
            />
          )
        },
      }),
      columnHelper.accessor('hasStartForm', {
        header: 'Start form',
        size: 90,
        enableSorting: false,
        cell: (info) =>
          info.getValue() ? (
            <Tooltip content="This definition has a start form.">
              <span className="flex">
                <FileText
                  className="size-3.5 text-[var(--type-form)]"
                  aria-label="Has a start form"
                />
              </span>
            </Tooltip>
          ) : (
            <span className="text-[var(--text-muted)]">-</span>
          ),
      }),
      columnHelper.accessor('deploymentId', {
        header: 'Deployment',
        size: 160,
        enableSorting: false,
        cell: (info) => <Identifier value={info.getValue()} keep={6} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 120,
        cell: (info) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              icon={<Play className="size-3.5" aria-hidden />}
              onClick={(event) => {
                event.stopPropagation()
                setStarting(info.row.original)
              }}
            >
              Start
            </Button>
          </div>
        ),
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <TopBar crumbs={[{ label: t('processes.title') }]} />

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 px-4 py-3">
          <Input
            value={search.q ?? ''}
            placeholder={`${t('common.search')} definitions`}
            aria-label="Search definitions"
            className="max-w-64"
            onChange={(event) =>
              void navigate({
                search: (current) => ({ ...current, q: event.target.value || undefined }),
              })
            }
          />
          <Button variant="secondary" onClick={() => void navigate({ to: '/processes/instances' })}>
            {t('processes.instances')}
          </Button>
        </div>

        {query.isError ? (
          <div className="px-4">
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          </div>
        ) : (
          <DataTable
            table={table}
            loading={query.isFetching}
            className="flex-1"
            onRowClick={(definition) =>
              void navigate({ to: '/processes/$key', params: { key: definition.key } })
            }
            empty={
              <EmptyState
                icon={<Workflow className="size-7" aria-hidden />}
                title="No process definitions"
                detail="A definition appears here once an application containing a BPMN process is deployed."
              />
            }
          />
        )}

        {query.data && query.data.totalPages > 1 && (
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            totalElements={query.data.totalElements}
            hasNext={query.data.hasNext}
            hasPrevious={query.data.hasPrevious}
            onPageChange={(page) => void navigate({ search: (current) => ({ ...current, page }) })}
            unit="definition"
          />
        )}
      </main>

      {starting && (
        <StartInstanceDialog
          definition={starting}
          open
          onOpenChange={(open) => !open && setStarting(null)}
        />
      )}
    </>
  )
}

/** Running versus completed inline, so the operator sees where the load is before drilling in. */
function InstanceBar({
  running,
  completed,
  suspended,
}: {
  running: number
  completed: number
  suspended: number
}) {
  const total = Math.max(1, running + completed + suspended)
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 w-24 overflow-hidden rounded-[var(--radius-full)] bg-[var(--surface-3)]">
        <span
          className="bg-[var(--color-accent)]"
          style={{ width: `${(running / total) * 100}%` }}
          aria-hidden
        />
        <span
          className="bg-[var(--text-muted)]"
          style={{ width: `${(completed / total) * 100}%` }}
          aria-hidden
        />
      </div>
      <span className="tabular whitespace-nowrap text-2xs text-[var(--text-secondary)]">
        {running} running
      </span>
    </div>
  )
}
