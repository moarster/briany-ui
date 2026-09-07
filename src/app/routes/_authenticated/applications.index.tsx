import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LayoutGrid, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  CATALOGUE_STALE_TIME,
  deleteModelerAppMutation,
  invalidate,
  isProblemError,
  listModelerAppsOptions,
} from '../../../api'
import type { ModelerAppRef, ModelerAppState } from '../../../api'
import { ApplicationTile } from '../../../features/applications/ApplicationTile'
import { CreateApplicationDialog } from '../../../features/applications/CreateApplicationDialog'
import { useDeploy } from '../../../features/applications/useDeploy'
import {
  AlertDialog,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Skeleton,
} from '../../../design/components'
import { cx } from '../../../lib/cx'
import { t } from '../../../lib/i18n'
import { TopBar } from '../../shell/TopBar'

const searchSchema = z.object({
  state: z.enum(['draft', 'synced', 'ahead']).optional(),
  q: z.string().optional(),
  page: z.number().int().min(0).default(0),
  create: z.boolean().optional(),
})

export const Route = createFileRoute('/_authenticated/applications/')({
  validateSearch: searchSchema,
  component: ApplicationsPage,
})

const PAGE_SIZE = 24

const filters: { value: ModelerAppState | undefined; label: string }[] = [
  { value: undefined, label: t('common.all') },
  { value: 'draft', label: t('state.draft') },
  { value: 'synced', label: t('state.synced') },
  { value: 'ahead', label: t('state.ahead') },
]

function ApplicationsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<ModelerAppRef | null>(null)

  const query = useQuery({
    ...listModelerAppsOptions({
      query: { page: search.page, size: PAGE_SIZE, includeStats: true, state: search.state },
    }),
    staleTime: CATALOGUE_STALE_TIME,
  })

  const remove = useMutation({
    ...deleteModelerAppMutation(),
    onSuccess: async () => {
      await invalidate.modelerApps(queryClient)
      toast.success(`${pendingDelete?.key} deleted.`)
      setPendingDelete(null)
    },
    onError: (error) => {
      toast.error(isProblemError(error) ? error.detail : 'The application could not be deleted.')
    },
  })

  // Client-side over the loaded page only. The empty state says so rather than implying
  // the search covers everything the server holds.
  const visible = useMemo(() => {
    const apps = query.data?.data ?? []
    const needle = search.q?.trim().toLowerCase()
    if (!needle) return apps
    return apps.filter(
      (app) =>
        app.key.toLowerCase().includes(needle) || (app.name ?? '').toLowerCase().includes(needle),
    )
  }, [query.data, search.q])

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) => {
    void navigate({ search: (current) => ({ ...current, ...patch }), replace: true })
  }

  return (
    <>
      <TopBar
        crumbs={[{ label: t('applications.title') }]}
        actions={
          <Button
            variant="primary"
            icon={<Plus className="size-3.5" aria-hidden />}
            onClick={() => setSearch({ create: true })}
          >
            {t('applications.new')}
          </Button>
        }
      />

      <main className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <Input
            value={search.q ?? ''}
            placeholder={`${t('common.search')} applications`}
            aria-label={`${t('common.search')} applications`}
            onChange={(event) => setSearch({ q: event.target.value || undefined })}
            className="max-w-64"
          />
          <div className="flex items-center gap-1" role="group" aria-label="Filter by state">
            {filters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                aria-pressed={search.state === filter.value}
                onClick={() => setSearch({ state: filter.value, page: 0 })}
                className={cx(
                  'rounded-[var(--radius-full)] border px-2.5 py-1 text-xs transition-colors',
                  search.state === filter.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4">
          {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

          {query.isLoading && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-40 rounded-[var(--radius-lg)]" />
              ))}
            </div>
          )}

          {query.isSuccess && visible.length === 0 && !search.q && !search.state && (
            <EmptyState
              icon={<LayoutGrid className="size-7" aria-hidden />}
              title={t('applications.empty')}
              detail={t('applications.emptyDetail')}
              action={
                <Button
                  variant="primary"
                  icon={<Plus className="size-3.5" aria-hidden />}
                  onClick={() => setSearch({ create: true })}
                >
                  {t('applications.create')}
                </Button>
              }
            />
          )}

          {query.isSuccess && visible.length === 0 && (search.q || search.state) && (
            <EmptyState
              title="Nothing matches"
              detail={`${t('applications.searchScope')} Clear the filters, or move to another page.`}
              action={
                <Button onClick={() => setSearch({ q: undefined, state: undefined, page: 0 })}>
                  Clear filters
                </Button>
              }
            />
          )}

          {query.isSuccess && visible.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
              {visible.map((app) => (
                <TileWithActions key={app.id} app={app} onDelete={() => setPendingDelete(app)} />
              ))}
              {/* Last, not first: the grid must not shift as applications are added. */}
              <NewApplicationTile onClick={() => setSearch({ create: true })} />
            </div>
          )}
        </div>

        {query.data && query.data.totalPages > 1 && (
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            totalElements={query.data.totalElements}
            hasNext={query.data.hasNext}
            hasPrevious={query.data.hasPrevious}
            onPageChange={(page) => setSearch({ page })}
            unit="application"
          />
        )}
      </main>

      <CreateApplicationDialog
        open={search.create === true}
        onOpenChange={(open) => setSearch({ create: open ? true : undefined })}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name ?? pendingDelete?.key}?`}
        destructive
        loading={remove.isPending}
        confirmLabel={t('common.delete')}
        challenge={
          pendingDelete ? { value: pendingDelete.key, label: 'Type the key to confirm' } : undefined
        }
        description={
          <>
            The workspace and all of its files are removed. If the application is deployed, deleting
            it undeploys the definitions first, which affects their running instances.
          </>
        }
        onConfirm={() => {
          if (pendingDelete) remove.mutate({ path: { key: pendingDelete.key } })
        }}
      />
    </>
  )
}

function TileWithActions({ app, onDelete }: { app: ModelerAppRef; onDelete: () => void }) {
  const { deploy, undeploy } = useDeploy(app.key)
  return <ApplicationTile app={app} onDeploy={deploy} onUndeploy={undeploy} onDelete={onDelete} />
}

function NewApplicationTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex min-h-40 flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)]',
        'border border-dashed border-[var(--border-strong)] text-[var(--text-muted)]',
        'transition-colors duration-[var(--duration-1)]',
        'hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
      )}
    >
      <Plus className="size-6" aria-hidden />
      <span className="text-xs font-medium">{t('applications.new')}</span>
    </button>
  )
}
