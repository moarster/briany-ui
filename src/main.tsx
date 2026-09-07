import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import './design/base.css'
import { client, configureApiHandlers } from './api'
import { Providers, queryClient } from './app/providers'
import { router } from './app/router'
import { useUiStore } from './app/ui-store'
import { loadRuntimeConfig } from './lib/runtime-config'
import { initTheme } from './lib/theme'

async function bootstrap() {
  // Runtime config first: one built image serves any environment, so nothing may issue a
  // request before the base URL is known.
  const config = await loadRuntimeConfig()
  client.setConfig({ baseUrl: config.apiBaseUrl })
  initTheme(config.features.glass)

  if (import.meta.env.DEV && import.meta.env.VITE_MSW === '1') {
    try {
      const { startMocks } = await import('./api/mocks/browser')
      await startMocks()
    } catch (error) {
      // A missing or unregistrable service worker must not stop the app booting. The
      // requests the mocks would have answered simply reach the backend instead, which is
      // a worse dev experience but a working one.
      console.error('The request mocks could not start; requests will reach the backend.', error)
    }
  }

  configureApiHandlers({
    onUnauthorized: () => {
      queryClient.clear()
      const current = window.location.pathname + window.location.search
      if (window.location.pathname !== '/login') {
        void router.navigate({ to: '/login', search: { redirect: current }, replace: true })
      }
    },
    onServiceUnavailable: (retryAfterSeconds) => {
      useUiStore.getState().reportBackendUnavailable(retryAfterSeconds)
    },
  })

  const container = document.getElementById('root')
  if (!container) throw new Error('#root is missing from index.html')

  createRoot(container).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  )
}

void bootstrap()
