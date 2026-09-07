import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FileText, Play, Workflow } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { CATALOGUE_STALE_TIME, listProcessesOptions } from '../../../api'
import type { ProcessDefinition } from '../../../api'
import { StartInstanceDialog } from '../../../features/processes/StartInstanceDialog'
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../../../design/components'
import { t } from '../../../lib/i18n'
import { TopBar } from '../../shell/TopBar'

const searchSchema = z.object({ all: z.boolean().default(false) })

export const Route = createFileRoute('/_authenticated/tasks/start')({
  validateSearch: searchSchema,
  component: StartProcessPage,
})

/**
 * Tasklist's Processes page: the definitions a person can start, with those carrying a
 * start form first, because those are the ones designed to be started by hand.
 */
function StartProcessPage() {
  const { all } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [starting, setStarting] = useState<ProcessDefinition | null>(null)

  const query = useQuery({
    ...listProcessesOptions({ query: { size: 200 } }),
    staleTime: CATALOGUE_STALE_TIME,
  })

  const { withForm, withoutForm } = useMemo(() => {
    const definitions = query.data?.data ?? []
    return {
      withForm: definitions.filter((definition) => definition.hasStartForm),
      withoutForm: definitions.filter((definition) => !definition.hasStartForm),
    }
  }, [query.data])

  const visible = all ? [...withForm, ...withoutForm] : withForm

  return (
    <>
      <TopBar crumbs={[{ label: t('tasks.title'), to: '/tasks' }, { label: 'Start a process' }]} />

      <main className="min-h-0 flex-1 overflow-auto p-4">
        {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

        {query.isLoading && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
        )}

        {query.isSuccess && visible.length === 0 && (
          <EmptyState
            icon={<Workflow className="size-7" aria-hidden />}
            title={all ? 'No process definitions' : 'No definitions with a start form'}
            detail={
              all
                ? 'A definition appears here once an application containing a BPMN process is deployed.'
                : 'Nothing deployed here carries a start form. Show all definitions to start one anyway.'
            }
            action={
              !all ? (
                <Button onClick={() => void navigate({ search: { all: true } })}>
                  {t('common.showAll')}
                </Button>
              ) : undefined
            }
          />
        )}

        {visible.length > 0 && (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
              {visible.map((definition) => (
                <Card key={definition.id} interactive className="flex flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 truncate text-sm font-medium text-[var(--text-primary)]">
                      {definition.name ?? definition.key}
                    </h2>
                    {definition.hasStartForm && (
                      <FileText
                        className="size-3.5 shrink-0 text-[var(--type-form)]"
                        aria-label="Has a start form"
                      />
                    )}
                  </div>
                  <p className="truncate font-[family-name:var(--font-mono)] text-2xs text-[var(--text-muted)]">
                    {definition.key}
                  </p>
                  {definition.description && (
                    <p className="line-clamp-2 text-xs text-[var(--text-muted)]">
                      {definition.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <Badge mono>v{definition.version}</Badge>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Play className="size-3.5" aria-hidden />}
                      onClick={() => setStarting(definition)}
                    >
                      Start
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {!all && withoutForm.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button variant="ghost" onClick={() => void navigate({ search: { all: true } })}>
                  {t('common.showAll')} ({withoutForm.length} without a start form)
                </Button>
              </div>
            )}
          </>
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
