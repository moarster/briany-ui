import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Download,
  FileUp,
  LayoutGrid,
  List,
  MoreVertical,
  Play,
  Plus,
  Rocket,
  Trash2,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  CATALOGUE_STALE_TIME,
  deleteModelerAppFileMutation,
  deleteModelerAppMutation,
  getModelerAppFileContent,
  getModelerAppOptions,
  invalidate,
  isProblemError,
  upsertModelerAppFileMutation,
} from '../../../api'
import type { ModelerAppFileSummary, ModelerFileType } from '../../../api'
import { ApplicationDetails } from '../../../features/applications/ApplicationDetails'
import { DeployFailurePanel } from '../../../features/applications/DeployFailurePanel'
import { FileCard } from '../../../features/applications/FileCard'
import { NewFileDialog } from '../../../features/applications/NewFileDialog'
import { ReadmePanel } from '../../../features/applications/ReadmePanel'
import { useDeploy } from '../../../features/applications/useDeploy'
import {
  AlertDialog,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  FILE_TYPE_LABEL,
  FileTypeIcon,
  IconButton,
  Input,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  RelativeTime,
  SectionHeader,
  Select,
  SeverityIcon,
  Skeleton,
  SplitPane,
  WorkspaceStatePill,
} from '../../../design/components'
import { cx } from '../../../lib/cx'
import { t } from '../../../lib/i18n'
import { TopBar } from '../../shell/TopBar'

const searchSchema = z.object({
  deploy: z.boolean().optional(),
  view: z.enum(['grid', 'list']).default('grid'),
})

export const Route = createFileRoute('/_authenticated/applications/$appKey/')({
  validateSearch: searchSchema,
  component: ApplicationPage,
})

function ApplicationPage() {
  const { appKey } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()

  const [fileQuery, setFileQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ModelerFileType | 'all'>('all')
  const [newFileType, setNewFileType] = useState<ModelerFileType | null>(null)
  const [pendingFileDelete, setPendingFileDelete] = useState<ModelerAppFileSummary | null>(null)
  const [confirmDeleteApp, setConfirmDeleteApp] = useState(false)
  const [confirmUndeploy, setConfirmUndeploy] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  const appQuery = useQuery({
    ...getModelerAppOptions({ path: { key: appKey }, query: { includeStats: true } }),
    staleTime: CATALOGUE_STALE_TIME,
  })

  const { deploy, undeploy, deploying, undeploying, failures, failureDetail, dismissFailure } =
    useDeploy(appKey)

  const upload = useMutation({
    ...upsertModelerAppFileMutation(),
    onSuccess: async (file) => {
      await invalidate.modelerApp(queryClient, appKey)
      toast.success(`${file.fileKey} uploaded.`)
    },
    onError: (error) =>
      toast.error(isProblemError(error) ? error.detail : 'The file could not be uploaded.'),
  })

  const removeFile = useMutation({
    ...deleteModelerAppFileMutation(),
    onSuccess: async () => {
      await invalidate.modelerApp(queryClient, appKey)
      toast.success(`${pendingFileDelete?.fileKey} deleted.`)
      setPendingFileDelete(null)
    },
    onError: (error) =>
      toast.error(isProblemError(error) ? error.detail : 'The file could not be deleted.'),
  })

  const removeApp = useMutation({
    ...deleteModelerAppMutation(),
    onSuccess: async () => {
      await invalidate.modelerApps(queryClient)
      toast.success(`${appKey} deleted.`)
      await navigate({ to: '/applications' })
    },
    onError: (error) =>
      toast.error(isProblemError(error) ? error.detail : 'The application could not be deleted.'),
  })

  const app = appQuery.data
  const files = useMemo(() => {
    const all = app?.files ?? []
    const needle = fileQuery.trim().toLowerCase()
    return all.filter((file) => {
      if (typeFilter !== 'all' && file.type !== typeFilter) return false
      if (!needle) return true
      return (
        file.fileKey.toLowerCase().includes(needle) ||
        (file.name ?? '').toLowerCase().includes(needle)
      )
    })
  }, [app, fileQuery, typeFilter])

  const filesWithErrors = (app?.files ?? []).filter((file) => file.errorCount > 0)

  if (appQuery.isError) {
    return (
      <>
        <TopBar
          crumbs={[{ label: t('applications.title'), to: '/applications' }, { label: appKey }]}
        />
        <main className="p-4">
          <ErrorState error={appQuery.error} onRetry={() => void appQuery.refetch()} />
        </main>
      </>
    )
  }

  if (!app) {
    return (
      <>
        <TopBar
          crumbs={[{ label: t('applications.title'), to: '/applications' }, { label: appKey }]}
        />
        <main className="flex flex-col gap-3 p-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-40" />
        </main>
      </>
    )
  }

  const deployLabel =
    app.state === 'draft'
      ? t('applications.deploy')
      : app.state === 'ahead'
        ? t('applications.deployChanges')
        : t('applications.redeploy')

  const attemptDeploy = () => {
    // Never attempt a deploy the server is certain to refuse.
    if (filesWithErrors.length > 0) {
      toast.error(
        `Fix the errors in ${filesWithErrors.map((file) => file.fileKey).join(', ')} before deploying.`,
      )
      return
    }
    deploy()
  }

  return (
    <>
      <TopBar
        crumbs={[
          { label: t('applications.title'), to: '/applications' },
          { label: app.name ?? app.key },
        ]}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--border-default)] px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-[var(--text-primary)]">
                {app.name ?? app.key}
              </h1>
              <WorkspaceStatePill state={app.state} />
              {app.deployedVersion !== undefined && (
                <span className="text-xs text-[var(--text-muted)]">
                  v{app.deployedVersion} . <RelativeTime value={app.deployedAt} />
                </span>
              )}
            </div>
            <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
              {app.key}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant={app.state === 'synced' ? 'secondary' : 'primary'}
              loading={deploying}
              onClick={attemptDeploy}
              icon={<Rocket className="size-3.5" aria-hidden />}
            >
              {deploying ? t('applications.deploying') : deployLabel}
              {app.state === 'ahead' && (
                <span
                  className="ml-1 size-1.5 rounded-full bg-[var(--color-warning)]"
                  aria-hidden
                />
              )}
            </Button>
            <Menu
              trigger={
                <IconButton
                  showTooltip={false}
                  label={t('common.more')}
                  icon={<MoreVertical className="size-4" aria-hidden />}
                />
              }
            >
              <MenuItem
                disabled={app.deployedVersion === undefined || undeploying}
                onSelect={() => setConfirmUndeploy(true)}
              >
                {t('applications.undeploy')}
              </MenuItem>
              <MenuSeparator />
              <MenuItem destructive onSelect={() => setConfirmDeleteApp(true)}>
                Delete application
              </MenuItem>
            </Menu>
          </div>
        </header>

        {failures && (
          <div className="shrink-0 px-4 pt-3">
            <DeployFailurePanel
              appKey={appKey}
              detail={failureDetail}
              failures={failures}
              onDismiss={dismissFailure}
            />
          </div>
        )}

        {/* Files on top, description below - the layout INIT.md asks for. */}
        <section className="shrink-0 border-b border-[var(--border-default)]">
          <SectionHeader title={t('applications.files')} count={app.files?.length ?? 0}>
            <Input
              value={fileQuery}
              onChange={(event) => setFileQuery(event.target.value)}
              placeholder={t('common.search')}
              aria-label="Search files"
              className="h-[var(--control-height-sm)] max-w-40"
            />
            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
              aria-label="Filter by file type"
              className="h-[var(--control-height-sm)] w-32"
              options={[
                { value: 'all', label: 'All types' },
                { value: 'bpmn', label: FILE_TYPE_LABEL.bpmn },
                { value: 'dmn', label: FILE_TYPE_LABEL.dmn },
                { value: 'bform', label: FILE_TYPE_LABEL.bform },
              ]}
            />
            <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] p-0.5">
              {(['grid', 'list'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  aria-label={`${view} view`}
                  aria-pressed={search.view === view}
                  onClick={() => void navigate({ search: (current) => ({ ...current, view }) })}
                  className={cx(
                    'rounded-[4px] p-1',
                    search.view === view
                      ? 'bg-[var(--surface-3)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)]',
                  )}
                >
                  {view === 'grid' ? (
                    <LayoutGrid className="size-3.5" aria-hidden />
                  ) : (
                    <List className="size-3.5" aria-hidden />
                  )}
                </button>
              ))}
            </div>
            {/* A menu, never a bare upload button: the type is always chosen explicitly. */}
            <Menu
              trigger={
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Plus className="size-3.5" aria-hidden />}
                >
                  {t('applications.addFile')}
                </Button>
              }
            >
              <MenuLabel>Create from a template</MenuLabel>
              <MenuItem onSelect={() => setNewFileType('bpmn')}>BPMN process</MenuItem>
              <MenuItem onSelect={() => setNewFileType('bform')}>Form</MenuItem>
              <MenuItem onSelect={() => setNewFileType('dmn')}>DMN decision</MenuItem>
              <MenuSeparator />
              <MenuItem
                icon={<FileUp className="size-3.5" aria-hidden />}
                onSelect={() => uploadRef.current?.click()}
              >
                Upload file...
              </MenuItem>
            </Menu>
            <input
              ref={uploadRef}
              type="file"
              accept=".bpmn,.dmn,.bform"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) upload.mutate({ path: { key: appKey }, body: { file } })
                event.target.value = ''
              }}
            />
          </SectionHeader>

          <div className="max-h-[46vh] overflow-auto px-3 pb-3">
            {files.length === 0 ? (
              <EmptyState
                title={app.files?.length ? 'Nothing matches' : 'No files yet'}
                detail={
                  app.files?.length
                    ? 'Clear the search or the type filter.'
                    : 'An application needs at least one BPMN process. Decisions and forms are added the same way.'
                }
                action={
                  app.files?.length ? undefined : (
                    <Button variant="primary" onClick={() => setNewFileType('bpmn')}>
                      New BPMN process
                    </Button>
                  )
                }
              />
            ) : search.view === 'grid' ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                {files.map((file) => (
                  <FileCard
                    key={file.id}
                    appKey={appKey}
                    file={file}
                    onDelete={() => setPendingFileDelete(file)}
                    onDownload={() => void downloadFile(appKey, file)}
                  />
                ))}
              </div>
            ) : (
              <ul className="flex flex-col">
                {files.map((file) => (
                  <li key={file.id}>
                    <FileRow
                      appKey={appKey}
                      file={file}
                      onDelete={() => setPendingFileDelete(file)}
                      onDownload={() => void downloadFile(appKey, file)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <SplitPane
          storageKey={`briany.split.application`}
          className="min-h-0 flex-1"
          left={<ApplicationDetails app={app} />}
          right={<ReadmePanel app={app} />}
        />
      </main>

      <NewFileDialog
        appKey={appKey}
        type={newFileType}
        open={newFileType !== null}
        onOpenChange={(open) => !open && setNewFileType(null)}
      />

      <AlertDialog
        open={pendingFileDelete !== null}
        onOpenChange={(open) => !open && setPendingFileDelete(null)}
        title={`Delete ${pendingFileDelete?.fileKey}?`}
        description="The file is removed from the workspace. Anything already deployed from it stays in the engine until the application is redeployed."
        destructive
        loading={removeFile.isPending}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (pendingFileDelete) {
            removeFile.mutate({ path: { key: appKey, fileKey: pendingFileDelete.fileKey } })
          }
        }}
      />

      <AlertDialog
        open={confirmUndeploy}
        onOpenChange={setConfirmUndeploy}
        title={`Undeploy ${app.name ?? app.key}?`}
        description="The deployed definitions are removed from the engine. Instances already running on them are affected: they can no longer advance through activities the definition provided."
        destructive
        loading={undeploying}
        confirmLabel={t('applications.undeploy')}
        onConfirm={() => {
          undeploy()
          setConfirmUndeploy(false)
        }}
      />

      <AlertDialog
        open={confirmDeleteApp}
        onOpenChange={setConfirmDeleteApp}
        title={`Delete ${app.name ?? app.key}?`}
        description="The workspace and all of its files are removed. Deleting a deployed application undeploys it first, which affects the instances running on its definitions."
        destructive
        loading={removeApp.isPending}
        confirmLabel={t('common.delete')}
        challenge={{ value: app.key, label: 'Type the key to confirm' }}
        onConfirm={() => removeApp.mutate({ path: { key: app.key } })}
      />
    </>
  )
}

/** The list view: the same affordances as the card, one row high, for many files. */
function FileRow({
  appKey,
  file,
  onDelete,
  onDownload,
}: {
  appKey: string
  file: ModelerAppFileSummary
  onDelete: () => void
  onDownload: () => void
}) {
  return (
    <div className="group flex h-[var(--row-height)] items-center gap-3 border-b border-[var(--border-subtle)] px-2 hover:bg-[var(--surface-2)]">
      <FileTypeIcon type={file.type} />
      <Link
        to="/applications/$appKey/files/$fileKey"
        params={{ appKey, fileKey: file.fileKey }}
        className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)] hover:text-[var(--color-primary)]"
      >
        {file.name ?? file.fileKey}
      </Link>
      <span className="hidden min-w-0 flex-1 truncate font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)] sm:block">
        {file.fileKey}
      </span>
      {file.errorCount > 0 && (
        <Badge tone="danger" icon={<SeverityIcon severity="error" className="size-3" />}>
          {file.errorCount}
        </Badge>
      )}
      <WorkspaceStatePill state={file.state} />
      <Menu
        trigger={
          <IconButton
            size="sm"
            showTooltip={false}
            label={t('common.more')}
            icon={<MoreVertical className="size-3.5" aria-hidden />}
          />
        }
      >
        {file.type === 'bpmn' && file.engineResourceId && (
          <>
            <MenuItem icon={<Play className="size-3.5" aria-hidden />}>
              <Link to="/processes/$key" params={{ key: file.fileKey }} className="w-full">
                {t('applications.openRuntime')}
              </Link>
            </MenuItem>
            <MenuSeparator />
          </>
        )}
        <MenuItem icon={<Download className="size-3.5" aria-hidden />} onSelect={onDownload}>
          {t('common.download')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          destructive
          icon={<Trash2 className="size-3.5" aria-hidden />}
          onSelect={onDelete}
        >
          {t('common.delete')}
        </MenuItem>
      </Menu>
    </div>
  )
}

/**
 * Downloads a workspace file through the generated client. The blob URL is revoked
 * immediately after the click, so nothing leaks.
 */
async function downloadFile(appKey: string, file: ModelerAppFileSummary) {
  try {
    const { data } = await getModelerAppFileContent({
      path: { key: appKey, fileKey: file.fileKey },
      parseAs: 'blob',
    })
    const url = URL.createObjectURL(data as unknown as Blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.resourceName
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.error(isProblemError(error) ? error.detail : 'The file could not be downloaded.')
  }
}
