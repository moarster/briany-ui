import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil } from 'lucide-react'
import { Suspense, lazy, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { invalidate, isProblemError, updateModelerAppMutation } from '../../api'
import type { ModelerApp } from '../../api'
import { Button, SectionHeader, Skeleton } from '../../design/components'
import { cx } from '../../lib/cx'
import { t } from '../../lib/i18n'

// Both are large and neither is needed until the panel is on screen: CodeMirror only in
// edit mode, react-markdown only in read mode.
const CodeEditor = lazy(() =>
  import('../../design/components/CodeEditor').then((module) => ({ default: module.CodeEditor })),
)
const MarkdownViewer = lazy(() =>
  import('../../design/components/MarkdownViewer').then((module) => ({
    default: module.MarkdownViewer,
  })),
)

export function ReadmePanel({ app }: { app: ModelerApp }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'read' | 'edit'>('read')
  const [draft, setDraft] = useState(app.readme ?? '')

  const saved = app.readme ?? ''
  const dirty = mode === 'edit' && draft !== saved

  // Leaving edit mode, or the server's copy changing underneath, resets the draft. Adjusted
  // during render rather than in an effect: an effect would paint the stale draft first.
  const [syncedWith, setSyncedWith] = useState({ mode, saved })
  if (syncedWith.mode !== mode || syncedWith.saved !== saved) {
    setSyncedWith({ mode, saved })
    if (mode === 'read' || syncedWith.saved !== saved) setDraft(saved)
  }

  const save = useMutation({
    ...updateModelerAppMutation(),
    onSuccess: async () => {
      await invalidate.modelerApp(queryClient, app.key)
      toast.success('README saved.')
    },
    onError: (error) => {
      toast.error(isProblemError(error) ? error.detail : 'The README could not be saved.')
    },
  })

  const commit = () => {
    save.mutate({
      path: { key: app.key },
      body: { name: app.name, description: app.description, readme: draft },
    })
  }

  // Cmd/Ctrl+S, consistent with the editors.
  useEffect(() => {
    if (mode !== 'edit') return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (dirty) commit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SectionHeader title={t('applications.readme')}>
        {dirty && (
          <span className="text-2xs text-[var(--color-warning)]">{t('editor.unsaved')}</span>
        )}
        {mode === 'edit' && (
          <Button
            size="sm"
            variant="primary"
            loading={save.isPending}
            disabled={!dirty}
            onClick={commit}
          >
            {t('common.save')}
          </Button>
        )}
        <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] p-0.5">
          {(['read', 'edit'] as const).map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={mode === candidate}
              onClick={() => setMode(candidate)}
              className={cx(
                'flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-2xs transition-colors',
                mode === candidate
                  ? 'bg-[var(--surface-3)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              {candidate === 'read' ? (
                <Eye className="size-3" aria-hidden />
              ) : (
                <Pencil className="size-3" aria-hidden />
              )}
              {candidate === 'read' ? t('common.read') : t('common.edit')}
            </button>
          ))}
        </div>
      </SectionHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        {mode === 'read' ? (
          <Suspense fallback={<Skeleton className="m-4 h-64" />}>
            <div className="p-4">
              <MarkdownViewer source={saved} />
            </div>
          </Suspense>
        ) : (
          <Suspense fallback={<Skeleton className="m-4 h-64" />}>
            <CodeEditor
              language="markdown"
              value={draft}
              onChange={setDraft}
              ariaLabel="README source"
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}
