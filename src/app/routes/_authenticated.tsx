import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '../../features/auth/store'
import { RouteErrorState } from '../../design/components'
import { BackendUnavailableBanner } from '../shell/BackendUnavailableBanner'
import { CommandPalette } from '../shell/CommandPalette'
import { Sidebar } from '../shell/Sidebar'

/**
 * The authenticated layout. Every route except `/login` lives under it, so the guard is
 * declared exactly once.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  errorComponent: ({ error, reset }) => <RouteErrorState error={error} onRetry={reset} />,
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--surface-0)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <BackendUnavailableBanner />
        <Outlet />
      </div>
      <CommandPalette />
    </div>
  )
}
