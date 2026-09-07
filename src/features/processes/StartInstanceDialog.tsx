// The viewer class is exported as `Form`; aliased for readability at the call sites.
import { Form as FormViewer } from '@bpmn-io/form-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getProcessStartFormOptions,
  invalidate,
  isProblemError,
  startProcessInstanceMutation,
} from '../../api'
import type { ProcessDefinition } from '../../api'
import { Button, Dialog, Field, Input, KeyValueEditor, Skeleton } from '../../design/components'
import { toVariableMap } from '../../design/components/KeyValueEditor'
import type { VariableEntry } from '../../design/components/KeyValueEditor'
import { t } from '../../lib/i18n'
import '../../design/vendor/form.css'

/**
 * Starts an instance. When the definition has a start form, that form is what the operator
 * fills in; when it has not, the same typed key/value editor the task detail falls back to
 * is used, so there is one variable-entry surface in the product rather than two.
 */
export function StartInstanceDialog({
  definition,
  open,
  onOpenChange,
}: {
  definition: ProcessDefinition
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [businessKey, setBusinessKey] = useState('')
  const [variables, setVariables] = useState<VariableEntry[]>([])
  const formRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)

  const formQuery = useQuery({
    ...getProcessStartFormOptions({ path: { key: definition.key } }),
    enabled: open && definition.hasStartForm,
    retry: false,
  })

  useEffect(() => {
    const container = formRef.current
    const schema = formQuery.data?.schema
    if (!open || !container || !schema) return

    const viewer = new FormViewer({ container })
    viewerRef.current = viewer
    void viewer.importSchema(schema)

    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [open, formQuery.data])

  const start = useMutation({
    ...startProcessInstanceMutation(),
    onSuccess: async (instance) => {
      await invalidate.processInstances(queryClient)
      toast.success(`Instance ${instance.id} started.`)
      onOpenChange(false)
      await navigate({ to: '/processes/instances/$id', params: { id: instance.id } })
    },
    onError: (error) =>
      toast.error(isProblemError(error) ? error.detail : 'The instance could not be started.'),
  })

  const submit = () => {
    const viewer = viewerRef.current
    if (viewer) {
      const { data, errors } = viewer.submit() as {
        data: Record<string, unknown>
        errors: Record<string, string[]>
      }
      if (Object.keys(errors).length > 0) {
        toast.error('Fix the highlighted fields before starting the instance.')
        return
      }
      start.mutate({
        path: { key: definition.key },
        body: { businessKey: businessKey || undefined, variables: data },
      })
      return
    }

    start.mutate({
      path: { key: definition.key },
      body: { businessKey: businessKey || undefined, variables: toVariableMap(variables) },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      width="lg"
      title={`Start ${definition.name ?? definition.key}`}
      description={`Version ${definition.version}.`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" loading={start.isPending} onClick={submit}>
            {t('processes.startInstance')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Business key"
          htmlFor="business-key"
          hint="Optional. Your own identifier for this instance, unique per definition."
        >
          <Input
            id="business-key"
            mono
            value={businessKey}
            onChange={(event) => setBusinessKey(event.target.value)}
          />
        </Field>

        {definition.hasStartForm && formQuery.isLoading && <Skeleton className="h-40" />}

        {definition.hasStartForm && formQuery.data && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3">
            <div ref={formRef} />
          </div>
        )}

        {(!definition.hasStartForm || formQuery.isError) && (
          <div>
            {formQuery.isError && (
              <p className="mb-2 text-xs text-[var(--text-muted)]">
                The start form could not be loaded, so the variables are entered directly.
              </p>
            )}
            <KeyValueEditor entries={variables} onChange={setVariables} />
          </div>
        )}
      </div>
    </Dialog>
  )
}
