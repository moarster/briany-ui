import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { createModelerAppMutation, invalidate, isProblemError } from '../../api'
import { Button, Dialog, Field, Input, Textarea } from '../../design/components'
import { t } from '../../lib/i18n'
import { createApplicationSchema, fieldErrors } from './validation'

export function CreateApplicationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const create = useMutation({
    ...createModelerAppMutation(),
    onSuccess: async (app) => {
      await invalidate.modelerApps(queryClient)
      toast.success(`Application ${app.key} created.`)
      onOpenChange(false)
      reset()
      await navigate({ to: '/applications/$appKey', params: { appKey: app.key } })
    },
    onError: (error) => {
      // A duplicate key is a 409 and belongs on the key field, not in a toast.
      if (isProblemError(error) && error.status === 409) {
        setErrors({ key: 'An application with this key already exists.' })
        return
      }
      setErrors(
        isProblemError(error) && error.errors.length > 0
          ? Object.fromEntries(error.errors.map((entry) => [entry.field, entry.message]))
          : {},
      )
      toast.error(isProblemError(error) ? error.detail : 'The application could not be created.')
    },
  })

  const reset = () => {
    setKey('')
    setName('')
    setDescription('')
    setErrors({})
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = createApplicationSchema.safeParse({
      key: key.trim(),
      name: name.trim() || undefined,
      description: description.trim() || undefined,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    create.mutate({ body: parsed.data })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
      title={t('applications.create')}
      description="An application bundles the processes, decisions and forms that deploy together."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            form="create-application"
            type="submit"
            loading={create.isPending}
          >
            {create.isPending ? t('common.creating') : t('common.create')}
          </Button>
        </>
      }
    >
      <form id="create-application" onSubmit={submit} className="flex flex-col gap-3">
        <Field
          label="Key"
          htmlFor="app-key"
          required
          error={errors.key}
          hint="Permanent. It identifies the application everywhere, including in the engine."
        >
          <Input
            id="app-key"
            mono
            autoFocus
            value={key}
            aria-invalid={Boolean(errors.key)}
            onChange={(event) => setKey(event.target.value)}
            placeholder="order-management"
          />
        </Field>
        <Field label="Name" htmlFor="app-name" error={errors.name}>
          <Input
            id="app-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Order management"
          />
        </Field>
        <Field label="Description" htmlFor="app-description" error={errors.description}>
          <Textarea
            id="app-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  )
}
