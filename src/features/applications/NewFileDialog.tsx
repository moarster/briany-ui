import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { invalidate, isProblemError, upsertModelerAppFileMutation } from '../../api'
import type { ModelerFileType } from '../../api'
import { Button, Dialog, Field, FILE_TYPE_LABEL, Input } from '../../design/components'
import { t } from '../../lib/i18n'
import { starterFor, toUploadFile } from '../../modeling/bpmn/templates/starter'
import { fieldErrors, newFileSchema } from './validation'

/**
 * Creates a file from a starter template and uploads it through the existing multipart
 * endpoint. The client generates the template rather than the server, because the shape
 * of a starter is an editor concern.
 */
export function NewFileDialog({
  appKey,
  type,
  open,
  onOpenChange,
  /** Prefilled by the form combobox's "Create form in this application" action. */
  initialKey,
  onCreated,
}: {
  appKey: string
  type: ModelerFileType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialKey?: string
  onCreated?: (fileKey: string) => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [key, setKey] = useState(initialKey ?? '')
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // The combobox's "Create form in this application" action prefills the key, so opening
  // the dialog adopts it. Adjusted during render; an effect would show an empty field first.
  const [openedWith, setOpenedWith] = useState({ open, initialKey })
  if (openedWith.open !== open || openedWith.initialKey !== initialKey) {
    setOpenedWith({ open, initialKey })
    if (open) setKey(initialKey ?? '')
  }

  const create = useMutation({
    ...upsertModelerAppFileMutation(),
    onSuccess: async (file) => {
      await invalidate.modelerApp(queryClient, appKey)
      toast.success(`${file.fileKey} created.`)
      onOpenChange(false)
      setKey('')
      setName('')
      if (onCreated) onCreated(file.fileKey)
      else
        await navigate({
          to: '/applications/$appKey/files/$fileKey',
          params: { appKey, fileKey: file.fileKey },
        })
    },
    onError: (error) => {
      if (isProblemError(error) && error.status === 409) {
        setErrors({ key: 'A file with this key already exists in this application.' })
        return
      }
      toast.error(isProblemError(error) ? error.detail : 'The file could not be created.')
    },
  })

  if (!type) return null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = newFileSchema.safeParse({ key: key.trim(), name: name.trim() || undefined })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    const content = starterFor(type, parsed.data.key, parsed.data.name ?? parsed.data.key)
    create.mutate({
      path: { key: appKey },
      body: { file: toUploadFile(type, parsed.data.key, content) },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`New ${FILE_TYPE_LABEL[type].toLowerCase()}`}
      description="A starter file is generated and opened in its editor."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="new-file" loading={create.isPending}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <form id="new-file" onSubmit={submit} className="flex flex-col gap-3">
        <Field
          label="Key"
          htmlFor="file-key"
          required
          error={errors.key}
          hint={
            'This becomes the id inside the file, the file key here, and the deployed ' +
            'definition key. Renaming it later produces a new definition, not a rename.'
          }
        >
          <Input
            id="file-key"
            mono
            autoFocus
            value={key}
            aria-invalid={Boolean(errors.key)}
            onChange={(event) => setKey(event.target.value)}
            placeholder="approveOrder"
          />
        </Field>
        <Field label="Name" htmlFor="file-name" error={errors.name}>
          <Input
            id="file-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Approve order"
          />
        </Field>
      </form>
    </Dialog>
  )
}
