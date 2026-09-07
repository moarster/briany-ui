import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { RouteErrorState } from '../../design/components'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => <Outlet />,
  errorComponent: ({ error, reset }) => <RouteErrorState error={error} onRetry={reset} />,
})
