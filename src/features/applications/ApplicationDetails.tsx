import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { invalidate, isProblemError, updateModelerAppMutation } from '../../api'
import type { ModelerApp } from '../../api'
import {
  CopyButton,
  Field,
  Identifier,
  Input,
  RelativeTime,
  Textarea,
} from '../../design/components'
import { t } from '../../lib/i18n'

/**
 * The narrow left column of the lower split: name and description, inline-editable with
 * a debounced save on blur, and the deployment facts operators paste into log queries.
 */
export function ApplicationDetails({ app }: { app: ModelerApp }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(app.name ?? '')
  const [description, setDescription] = useState(app.description ?? '')
  const [deploymentOpen, setDeploymentOpen] = useState(false)

  // Server state wins whenever it changes underneath an untouched field.
  const dirty = useRef(false)
  useEffect(() => {
    if (dirty.current) return
    setName(app.name ?? '')
    setDescription(app.description ?? '')
  }, [app.name, app.description])

  const save = useMutation({
    ...updateModelerAppMutation(),
    onSuccess: async () => {
      dirty.current = false
      await invalidate.modelerApp(queryClient, app.key)
    },
    onError: (error) => {
      toast.error(isProblemError(error) ? error.detail : 'The change could not be saved.')
    },
  })

  const commit = () => {
    if (!dirty.current) return
    if ((app.name ?? '') === name && (app.description ?? '') === description) {
      dirty.current = false
      return
    }
    // `readme` is sent unchanged: the endpoint replaces the whole metadata record.
    save.mutate({
      path: { key: app.key },
      body: { name, description, readme: app.readme },
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Field label="Name" htmlFor="app-detail-name">
        <Input
          id="app-detail-name"
          value={name}
          onBlur={commit}
          onChange={(event) => {
            dirty.current = true
            setName(event.target.value)
          }}
        />
      </Field>

      <Field label="Description" htmlFor="app-detail-description">
        <Textarea
          id="app-detail-description"
          rows={4}
          value={description}
          onBlur={commit}
          onChange={(event) => {
            dirty.current = true
            setDescription(event.target.value)
          }}
        />
      </Field>

      <Field label="Key" htmlFor="app-detail-key" hint="Permanent.">
        <div className="flex items-center gap-1">
          <Input id="app-detail-key" mono readOnly value={app.key} />
          <CopyButton value={app.key} />
        </div>
      </Field>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-[var(--text-muted)]">Created</dt>
        <dd className="text-[var(--text-secondary)]">
          <RelativeTime value={app.createdAt} />
        </dd>
        <dt className="text-[var(--text-muted)]">Updated</dt>
        <dd className="text-[var(--text-secondary)]">
          <RelativeTime value={app.updatedAt} />
        </dd>
      </dl>

      <details
        open={deploymentOpen}
        onToggle={(event) => setDeploymentOpen(event.currentTarget.open)}
        className="rounded-[var(--radius-sm)] border border-[var(--border-default)]"
      >
        <summary className="cursor-pointer px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
          {t('applications.deployment')}
        </summary>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 border-t border-[var(--border-default)] p-2.5 text-xs">
          <dt className="text-[var(--text-muted)]">Version</dt>
          <dd className="tabular text-[var(--text-secondary)]">{app.deployedVersion ?? '-'}</dd>
          <dt className="text-[var(--text-muted)]">Deployed</dt>
          <dd className="text-[var(--text-secondary)]">
            {app.deployedAt ? <RelativeTime value={app.deployedAt} /> : t('common.never')}
          </dd>
          <dt className="text-[var(--text-muted)]">Deployment id</dt>
          <dd>
            {app.deploymentId ? (
              <Identifier value={app.deploymentId} />
            ) : (
              <span className="text-[var(--text-muted)]">-</span>
            )}
          </dd>
          <dt className="text-[var(--text-muted)]">App definition id</dt>
          <dd>
            {app.appDefinitionId ? (
              <Identifier value={app.appDefinitionId} />
            ) : (
              <span className="text-[var(--text-muted)]">-</span>
            )}
          </dd>
        </dl>
      </details>
    </div>
  )
}
