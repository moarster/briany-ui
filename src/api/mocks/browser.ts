import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * Dev only, behind `VITE_MSW=1`. Never bundled into production: the dynamic import that
 * reaches this module is guarded by `import.meta.env.DEV` in main.tsx.
 */
export async function startMocks() {
  const worker = setupWorker(...handlers)
  await worker.start({
    // The real endpoints are served by the backend; only the unimplemented ones are
    // mocked, so an unhandled request must pass straight through.
    onUnhandledRequest: 'bypass',
    quiet: true,
  })
}
