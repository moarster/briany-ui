import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useBlocker, useNavigate } from '@tanstack/react-router'
import { RotateCcw, Save } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  CATALOGUE_STALE_TIME,
  getModelerAppOptions,
  invalidate,
  isProblemError,
  updateModelerAppFileContentMutation,
  upsertModelerAppFileMutation,
} from '../../api'
import type { ModelerAppFileSummary } from '../../api'
import {
  AlertDialog,
  Button,
  ErrorState,
  Skeleton,
  WorkspaceStatePill,
} from '../../design/components'
import { t } from '../../lib/i18n'
import { toUploadFile } from '../bpmn/templates/starter'
import { ProblemsDrawer } from './ProblemsDrawer'
import { TabStrip } from './TabStrip'
import { useEditorStore, tabsFor } from './editor-store'
import type { EditorHandle, EditorProblem } from './types'
import { contentHash, useFileContent } from './useFileContent'

// Each modeler is loaded only on the route that needs it.
const BpmnEditor = lazy(() => import('../bpmn/BpmnEditor'))
const FormEditor = lazy(() => import('../form/FormEditor'))
const DmnEditor = lazy(() => import('../dmn/DmnEditor'))

/**
 * One shell for all three editors, so behaviour is identical whichever file is open: the
 * host owns saving, dirty tracking, the guard and the Problems drawer, and an editor only
 * serialises its content and reports its problems upward.
 */
export function EditorHost({
  appKey,
  fileKey,
  selectElement,
}: {
  appKey: string
  fileKey: string
  /** Set by the deploy failure panel's `<fileKey>#<elementId>` links. */
  selectElement?: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const appQuery = useQuery({
    ...getModelerAppOptions({ path: { key: appKey } }),
    staleTime: CATALOGUE_STALE_TIME,
  })
  const contentQuery = useFileContent(appKey, fileKey)

  const file = appQuery.data?.files?.find((candidate) => candidate.fileKey === fileKey)

  const handleRef = useRef<EditorHandle | null>(null)
  const [baselineHash, setBaselineHash] = useState<string | null>(null)
  const [problems, setProblems] = useState<EditorProblem[]>([])
  const [confirmRevert, setConfirmRevert] = useState(false)
  const [keyMismatch, setKeyMismatch] = useState<{ newKey: string; content: string } | null>(null)

  const openTab = useEditorStore((state) => state.openTab)
  const closeTab = useEditorStore((state) => state.closeTab)
  const setDirty = useEditorStore((state) => state.setDirty)
  const dirtyMap = useEditorStore((state) => state.dirty)
  const tabsMap = useEditorStore((state) => state.tabs)

  const tabs = tabsMap[appKey] ?? tabsFor(appKey)
  const dirty = dirtyMap[`${appKey}/${fileKey}`] === true
  const anyDirty = tabs.some((tab) => dirtyMap[`${appKey}/${tab.fileKey}`] === true)

  useEffect(() => {
    if (file)
      openTab(appKey, { fileKey: file.fileKey, name: file.name ?? file.fileKey, type: file.type })
  }, [appKey, file, openTab])

  // The baseline is set once per loaded file and then only by a successful save. Adjusted
  // during render, so the first paint after a load already knows the file is not dirty.
  const [baselineFor, setBaselineFor] = useState<string | undefined>(undefined)
  if (typeof contentQuery.data === 'string' && baselineFor !== contentQuery.data) {
    setBaselineFor(contentQuery.data)
    setBaselineHash(contentHash(contentQuery.data))
  }

  const onContentChange = useCallback(
    (serialised: string) => {
      if (baselineHash === null) return
      setDirty(appKey, fileKey, contentHash(serialised) !== baselineHash)
    },
    [appKey, fileKey, baselineHash, setDirty],
  )

  const save = useMutation({
    ...updateModelerAppFileContentMutation(),
    onSuccess: async (updated, variables) => {
      const body = variables.body as { file: File }
      setBaselineHash(contentHash(await body.file.text()))
      setDirty(appKey, fileKey, false)
      await invalidate.modelerApp(queryClient, appKey)
      toast.success(`${updated.fileKey} saved.`)
    },
    onError: (error) => {
      toast.error(isProblemError(error) ? error.detail : 'The file could not be saved.')
    },
  })

  // "Save as a new file" - the escape hatch when the id inside the file was renamed.
  const saveAsNew = useMutation({
    ...upsertModelerAppFileMutation(),
    onSuccess: async (created) => {
      setDirty(appKey, fileKey, false)
      setKeyMismatch(null)
      await invalidate.modelerApp(queryClient, appKey)
      toast.success(`Saved as ${created.fileKey}.`)
      await navigate({
        to: '/applications/$appKey/files/$fileKey',
        params: { appKey, fileKey: created.fileKey },
      })
    },
    onError: (error) =>
      toast.error(isProblemError(error) ? error.detail : 'The file could not be created.'),
  })

  const doSave = useCallback(async () => {
    const handle = handleRef.current
    if (!handle || !file) return
    const content = await handle.serialise()

    // The derived key follows the id inside the file. If the author renamed it, the PUT
    // rejects with a mismatch - detect it here and explain it, rather than letting them
    // discover it as a raw 400.
    const embedded = embeddedKey(content, file.type)
    if (embedded && embedded !== file.fileKey) {
      setKeyMismatch({ newKey: embedded, content })
      return
    }

    save.mutate({
      path: { key: appKey, fileKey },
      body: { file: toUploadFile(file.type, file.fileKey, content) },
    })
  }, [appKey, fileKey, file, save])

  // Cmd/Ctrl+S, bound at the host so every editor gets it for free.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (dirty) void doSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dirty, doSave])

  // Two guards: the router blocker for in-app navigation, beforeunload for the browser.
  useBlocker({
    shouldBlockFn: () =>
      anyDirty && !window.confirm(`${t('editor.leaveTitle')}\n\n${t('editor.leaveDetail')}`),
    enableBeforeUnload: () => anyDirty,
  })

  const serverProblems = useMemo<EditorProblem[]>(() => fileProblems(file), [file])
  const allProblems = useMemo(() => [...problems, ...serverProblems], [problems, serverProblems])

  if (appQuery.isError || contentQuery.isError) {
    return (
      <div className="p-4">
        <ErrorState
          error={appQuery.error ?? contentQuery.error}
          onRetry={() => {
            void appQuery.refetch()
            void contentQuery.refetch()
          }}
        />
      </div>
    )
  }

  if (!file || typeof contentQuery.data !== 'string') {
    return (
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-8" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const editorProps = {
    initialContent: contentQuery.data,
    appKey,
    fileKey,
    selectElement,
    onChange: onContentChange,
    onProblems: setProblems,
    onReady: (handle: EditorHandle) => {
      handleRef.current = handle
    },
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border-default)] px-3 pt-1.5">
        <TabStrip
          appKey={appKey}
          tabs={tabs}
          activeFileKey={fileKey}
          isDirty={(candidate) => dirtyMap[`${appKey}/${candidate}`] === true}
          onClose={(candidate) => {
            if (
              dirtyMap[`${appKey}/${candidate}`] === true &&
              !window.confirm(t('editor.leaveTitle'))
            ) {
              return
            }
            closeTab(appKey, candidate)
            if (candidate === fileKey) {
              void navigate({ to: '/applications/$appKey', params: { appKey } })
            }
          }}
        />

        <div className="ml-auto flex shrink-0 items-center gap-2 pb-1.5">
          <WorkspaceStatePill state={file.state} />
          <Button
            size="sm"
            variant="ghost"
            disabled={!dirty}
            onClick={() => setConfirmRevert(true)}
            icon={<RotateCcw className="size-3.5" aria-hidden />}
          >
            {t('common.revert')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!dirty}
            loading={save.isPending}
            onClick={() => void doSave()}
            icon={<Save className="size-3.5" aria-hidden />}
          >
            {t('common.save')}
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <Suspense fallback={<Skeleton className="m-3 h-full" />}>
          {file.type === 'bpmn' && <BpmnEditor {...editorProps} />}
          {file.type === 'bform' && <FormEditor {...editorProps} />}
          {file.type === 'dmn' && <DmnEditor {...editorProps} />}
        </Suspense>
      </div>

      <ProblemsDrawer
        problems={allProblems}
        onSelect={(problem) => {
          if (problem.elementId) handleRef.current?.reveal?.(problem.elementId)
        }}
      />

      <AlertDialog
        open={confirmRevert}
        onOpenChange={setConfirmRevert}
        title="Discard your changes?"
        description="The file is reloaded from the workspace and everything you have edited since the last save is lost."
        destructive
        confirmLabel={t('common.revert')}
        onConfirm={() => {
          setConfirmRevert(false)
          setDirty(appKey, fileKey, false)
          void contentQuery.refetch()
        }}
      />

      <AlertDialog
        open={keyMismatch !== null}
        onOpenChange={(open) => !open && setKeyMismatch(null)}
        title="The id inside this file changed"
        confirmLabel="Save as a new file"
        cancelLabel="Keep editing"
        description={
          <>
            This file is stored under <code>{file.fileKey}</code>, but its id is now{' '}
            <code>{keyMismatch?.newKey}</code>. The key is derived from the id, so saving in place
            is rejected. Save this as a new file under the new key, or change the id back.
          </>
        }
        onConfirm={() => {
          if (!keyMismatch) return
          saveAsNew.mutate({
            path: { key: appKey },
            body: { file: toUploadFile(file.type, keyMismatch.newKey, keyMismatch.content) },
          })
        }}
      />
    </div>
  )
}

function fileProblems(file: ModelerAppFileSummary | undefined): EditorProblem[] {
  if (!file || file.errorCount === 0) return []
  // The summary carries only a count; the drawer says so rather than inventing detail.
  return [
    {
      id: 'server-summary',
      severity: 'error',
      source: 'server',
      message: `The server reported ${file.errorCount} problem${file.errorCount === 1 ? '' : 's'} with this file the last time it was validated.`,
    },
  ]
}

/**
 * Reads the id the derived `fileKey` is computed from: the single `<process>`,
 * `<decision>`, or the form schema's `id`.
 */
function embeddedKey(content: string, type: 'bpmn' | 'dmn' | 'bform'): string | null {
  if (type === 'bform') {
    try {
      const schema = JSON.parse(content) as { id?: string }
      return schema.id ?? null
    } catch {
      return null
    }
  }
  const tag = type === 'bpmn' ? 'process' : 'decision'
  const match = new RegExp(`<(?:[\\w.-]+:)?${tag}\\b[^>]*\\bid="([^"]+)"`).exec(content)
  return match?.[1] ?? null
}
