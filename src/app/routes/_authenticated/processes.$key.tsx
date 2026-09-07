import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Play } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { z } from 'zod'
import {
  CATALOGUE_STALE_TIME,
  getProcessOptions,
  listProcessDefinitionVersionsOptions,
} from '../../../api'
import { BpmnViewer } from '../../../features/processes/BpmnViewer'
import { InstanceTable } from '../../../features/processes/InstanceTable'
import { StartInstanceDialog } from '../../../features/processes/StartInstanceDialog'
import { useProcessXml } from '../../../features/processes/useProcessXml'
import {
  Badge,
  Button,
  CopyButton,
  DataTable,
  ErrorState,
  Identifier,
  Select,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '../../../design/components'
import { t } from '../../../lib/i18n'
import { TopBar } from '../../shell/TopBar'
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type { ProcessDefinition } from '../../../api'

const CodeEditor = lazy(() =>
  import('../../../design/components/CodeEditor').then((module) => ({
    default: module.CodeEditor,
  })),
)

const searchSchema = z.object({
  // Switching versions is a search param, not a route change: the page is the same.
  version: z.number().int().optional(),
  tab: z.enum(['instances', 'versions', 'xml']).default('instances'),
  page: z.number().int().min(0).default(0),
})

export const Route = createFileRoute('/_authenticated/processes/$key')({
  validateSearch: searchSchema,
  component: DefinitionPage,
})

const columnHelper = createColumnHelper<ProcessDefinition>()

function DefinitionPage() {
  const { key } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [starting, setStarting] = useState(false)

  const definitionQuery = useQuery({
    ...getProcessOptions({ path: { key }, query: { includeStats: true } }),
    staleTime: CATALOGUE_STALE_TIME,
  })
  const versionsQuery = useQuery({
    ...listProcessDefinitionVersionsOptions({ path: { key } }),
    staleTime: CATALOGUE_STALE_TIME,
  })
  const xmlQuery = useProcessXml(key, search.version)

  const definition = definitionQuery.data
  const versions = versionsQuery.data?.data ?? []

  const versionColumns = [
    columnHelper.accessor('version', {
      header: 'Version',
      size: 100,
      cell: (info) => <Badge mono>v{info.getValue()}</Badge>,
    }),
    columnHelper.accessor('deploymentId', {
      header: 'Deployment',
      cell: (info) => <Identifier value={info.getValue()} keep={8} />,
    }),
    columnHelper.accessor((row) => row.stats?.total ?? 0, {
      id: 'instances',
      header: 'Instances',
      size: 120,
      cell: (info) => <span className="tabular">{info.getValue()}</span>,
    }),
  ]

  const versionTable = useReactTable({
    data: versions,
    columns: versionColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (definitionQuery.isError) {
    return (
      <>
        <TopBar crumbs={[{ label: t('processes.title'), to: '/processes' }, { label: key }]} />
        <main className="p-4">
          <ErrorState
            error={definitionQuery.error}
            onRetry={() => void definitionQuery.refetch()}
          />
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar
        crumbs={[
          { label: t('processes.title'), to: '/processes' },
          { label: definition?.name ?? key },
        ]}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--border-default)] px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-[var(--text-primary)]">
              {definition?.name ?? key}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
                {key}
              </span>
              <CopyButton value={key} />
              {definition && (
                <span className="text-xs text-[var(--text-muted)]">
                  deployment <Identifier value={definition.deploymentId} keep={6} />
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {versions.length > 1 && (
              <Select
                aria-label="Version"
                className="w-28"
                value={String(search.version ?? definition?.version ?? '')}
                onValueChange={(value) =>
                  void navigate({ search: (current) => ({ ...current, version: Number(value) }) })
                }
                options={versions.map((entry) => ({
                  value: String(entry.version),
                  label: `v${entry.version}`,
                }))}
              />
            )}
            <Button
              variant="primary"
              disabled={!definition}
              icon={<Play className="size-3.5" aria-hidden />}
              onClick={() => setStarting(true)}
            >
              {t('processes.startInstance')}
            </Button>
          </div>
        </header>

        {/* Diagram-first: the model is the primary way an operator reads a definition. */}
        <div className="h-72 shrink-0 border-b border-[var(--border-default)]">
          {xmlQuery.isError ? (
            <div className="p-4">
              <ErrorState compact error={xmlQuery.error} onRetry={() => void xmlQuery.refetch()} />
            </div>
          ) : (
            <BpmnViewer xml={xmlQuery.data} className="h-full" />
          )}
        </div>

        <Tabs
          value={search.tab}
          onValueChange={(tab) =>
            void navigate({ search: (current) => ({ ...current, tab: tab as 'instances' }) })
          }
          className="min-h-0 flex-1"
        >
          <TabList>
            <Tab value="instances">{t('processes.instances')}</Tab>
            <Tab value="versions" count={versions.length}>
              {t('processes.versions')}
            </Tab>
            <Tab value="xml">{t('processes.xml')}</Tab>
          </TabList>

          <TabPanel value="instances" className="flex min-h-0 flex-col">
            <InstanceTable
              processDefinitionKey={key}
              page={search.page}
              onPageChange={(page) =>
                void navigate({ search: (current) => ({ ...current, page }) })
              }
            />
          </TabPanel>

          <TabPanel value="versions" className="overflow-auto">
            <DataTable table={versionTable} loading={versionsQuery.isFetching} />
          </TabPanel>

          <TabPanel value="xml" className="min-h-0">
            <Suspense fallback={<Skeleton className="m-3 h-64" />}>
              <div className="relative h-full">
                <div className="absolute right-3 top-2 z-[var(--z-sticky)]">
                  <CopyButton value={xmlQuery.data ?? ''} withLabel />
                </div>
                <CodeEditor
                  language="xml"
                  readOnly
                  value={xmlQuery.data ?? ''}
                  ariaLabel="Deployed BPMN XML"
                />
              </div>
            </Suspense>
          </TabPanel>
        </Tabs>
      </main>

      {definition && (
        <StartInstanceDialog definition={definition} open={starting} onOpenChange={setStarting} />
      )}
    </>
  )
}
