import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  deployModelerAppMutation,
  invalidate,
  isProblemError,
  parseDeployErrors,
  undeployModelerAppMutation,
} from '../../api'
import type { DeployErrorTarget } from '../../api'

/**
 * Deploy is never optimistic. A failure is a persistent panel, not a toast, because the
 * whole value of a modeler over a ZIP upload is that the engine's rejection lands on the
 * file and the element that caused it.
 */
export function useDeploy(appKey: string) {
  const queryClient = useQueryClient()
  const [failures, setFailures] = useState<DeployErrorTarget[] | null>(null)
  const [failureDetail, setFailureDetail] = useState<string | null>(null)

  const deploy = useMutation({
    ...deployModelerAppMutation(),
    onMutate: () => {
      setFailures(null)
      setFailureDetail(null)
    },
    onSuccess: async () => {
      await invalidate.afterDeploy(queryClient, appKey)
      toast.success(`${appKey} deployed.`)
    },
    onError: (error) => {
      if (isProblemError(error) && (error.status === 400 || error.status === 409)) {
        setFailureDetail(error.detail)
        setFailures(parseDeployErrors(error.errors))
        return
      }
      toast.error(isProblemError(error) ? error.detail : 'The deploy failed.')
    },
  })

  const undeploy = useMutation({
    ...undeployModelerAppMutation(),
    onSuccess: async () => {
      await invalidate.afterDeploy(queryClient, appKey)
      toast.success(`${appKey} undeployed.`)
    },
    onError: (error) => {
      toast.error(isProblemError(error) ? error.detail : 'The undeploy failed.')
    },
  })

  return {
    deploy: () => deploy.mutate({ path: { key: appKey } }),
    undeploy: () => undeploy.mutate({ path: { key: appKey } }),
    deploying: deploy.isPending,
    undeploying: undeploy.isPending,
    failures,
    failureDetail,
    dismissFailure: () => {
      setFailures(null)
      setFailureDetail(null)
    },
  }
}
