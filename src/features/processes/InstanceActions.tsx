import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  cancelProcessInstanceMutation,
  deleteProcessInstanceMutation,
  invalidate,
  isProblemError,
} from '../../api'
import type { ProcessInstance } from '../../api'
import { AlertDialog, IconButton, Menu, MenuItem, MenuSeparator } from '../../design/components'
import { t } from '../../lib/i18n'

/**
 * Cancel and delete. Neither is optimistic, and both confirm: cancel ends a running
 * instance but keeps its history, delete removes the record entirely.
 */
export function InstanceActions({
  instance,
  onDeleted,
}: {
  instance: ProcessInstance
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onDeleted?: () => void
}) {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState<'cancel' | 'delete' | null>(null)

  const cancel = useMutation({
    ...cancelProcessInstanceMutation(),
    onSuccess: async () => {
      await invalidate.processInstances(queryClient)
      await invalidate.processInstance(queryClient, instance.id)
      toast.success(`Instance ${instance.id} cancelled.`)
      setConfirming(null)
    },
    onError: (error) =>
      toast.error(isProblemError(error) ? error.detail : 'The instance could not be cancelled.'),
  })

  const remove = useMutation({
    ...deleteProcessInstanceMutation(),
    onSuccess: async () => {
      await invalidate.processInstances(queryClient)
      toast.success(`Instance ${instance.id} deleted.`)
      setConfirming(null)
      onDeleted?.()
    },
    onError: (error) =>
      toast.error(isProblemError(error) ? error.detail : 'The instance could not be deleted.'),
  })

  return (
    <>
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
        <MenuItem disabled={instance.state !== 'running'} onSelect={() => setConfirming('cancel')}>
          {t('processes.cancelInstance')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem destructive onSelect={() => setConfirming('delete')}>
          {t('processes.deleteInstance')}
        </MenuItem>
      </Menu>

      <AlertDialog
        open={confirming === 'cancel'}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Cancel instance ${instance.id}?`}
        description="The instance stops immediately and every execution inside it is terminated. Its history is kept, so it stays queryable with the state it ended in."
        destructive
        loading={cancel.isPending}
        confirmLabel={t('processes.cancelInstance')}
        onConfirm={() => cancel.mutate({ path: { id: instance.id } })}
      />

      <AlertDialog
        open={confirming === 'delete'}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Delete instance ${instance.id}?`}
        description="The instance and its entire history are removed permanently. Unlike cancelling, this leaves no record behind."
        destructive
        loading={remove.isPending}
        confirmLabel={t('common.delete')}
        challenge={{ value: instance.id, label: 'Type the instance id to confirm' }}
        onConfirm={() => remove.mutate({ path: { id: instance.id } })}
      />
    </>
  )
}
