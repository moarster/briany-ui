import { createRouter } from '@tanstack/react-router'
import { RouteErrorState } from '../design/components'
import { EmptyState } from '../design/components/states'
import { t } from '../lib/i18n'
import { queryClient } from './providers'
import { routeTree } from '../routeTree.gen'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  defaultErrorComponent: ({ error, reset }) => <RouteErrorState error={error} onRetry={reset} />,
  defaultNotFoundComponent: () => (
    <EmptyState title={t('error.notFound')} detail={t('error.notFoundDetail')} />
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
