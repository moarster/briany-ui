import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { TooltipProvider } from '../src/design/components'

/**
 * Renders a component inside the providers it needs, on a throwaway router so components
 * that use `<Link>` or `useNavigate` work without the whole route tree.
 */
export async function renderWithProviders(ui: ReactNode, { path = '/' }: { path?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <TooltipProvider>{ui}</TooltipProvider>,
  })
  // Every destination the components under test can link to. Declared so a bad `to=` in a
  // component fails the test rather than silently rendering a dead link.
  const stubs = [
    '/applications',
    '/applications/$appKey',
    '/applications/$appKey/files/$fileKey',
    '/processes',
    '/processes/$key',
    '/processes/instances',
    '/processes/instances/$id',
    '/tasks',
    '/login',
  ].map((stubPath) =>
    createRoute({ getParentRoute: () => rootRoute, path: stubPath, component: () => null }),
  )

  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, ...stubs]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  // The router resolves its matches asynchronously, so nothing paints until it has
  // loaded. Awaiting here keeps the tests themselves free of waitFor boilerplate.
  await router.load()

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <RouterProvider router={router as any} />
      </QueryClientProvider>,
    ),
  }
}
