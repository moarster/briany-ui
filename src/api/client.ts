import { client } from './generated/client.gen'
import { ProblemError } from './problem'
import type { Problem } from './generated/types.gen'
import { currentCredential, useAuthStore } from '../features/auth/store'

/**
 * The single configured client. Everything that talks to the backend goes through it;
 * there is no `fetch` call anywhere outside `src/api`.
 *
 * `throwOnError` is on (see runtime-config.ts), so every failure arrives here as an
 * error interceptor call and leaves as a `ProblemError` on the promise's rejection path,
 * which is what TanStack Query and every error boundary in this app expect.
 */

let onUnauthorized: (() => void) | null = null
let onServiceUnavailable: ((retryAfterSeconds: number | null) => void) | null = null

/** Wired by the router, so a 401 can redirect while preserving the intended route. */
export function configureApiHandlers(handlers: {
  onUnauthorized: () => void
  onServiceUnavailable: (retryAfterSeconds: number | null) => void
}) {
  onUnauthorized = handlers.onUnauthorized
  onServiceUnavailable = handlers.onServiceUnavailable
}

client.interceptors.request.use((request: Request) => {
  const credential = currentCredential()
  if (credential) request.headers.set('Authorization', credential.header)
  return request
})

client.interceptors.error.use((error: unknown, response: Response | undefined) => {
  if (!response) {
    // fetch itself failed: no response, so there is no problem+json to read.
    const detail =
      error instanceof DOMException && error.name === 'AbortError'
        ? 'The request was cancelled.'
        : 'The backend could not be reached. Check that it is running and reachable.'
    return new ProblemError(0, undefined, detail)
  }

  if (response.status === 401) {
    // The stored credential is no longer accepted; drop it before anything retries with
    // it and locks the account out.
    useAuthStore.getState().signOut()
    onUnauthorized?.()
  }

  if (response.status === 503) {
    const header = response.headers.get('Retry-After')
    const seconds = header === null ? Number.NaN : Number.parseInt(header, 10)
    onServiceUnavailable?.(Number.isFinite(seconds) ? seconds : null)
  }

  const problem = isProblem(error) ? error : undefined
  return new ProblemError(response.status, problem, defaultDetail(response.status))
})

function isProblem(value: unknown): value is Problem {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function defaultDetail(status: number): string {
  switch (status) {
    case 400:
      return 'The request was rejected as invalid.'
    case 401:
      return 'Your session is no longer valid. Sign in again.'
    case 403:
      return 'You are not allowed to do this.'
    case 404:
      return 'This resource does not exist, or is no longer available.'
    case 409:
      return 'This conflicts with the current state of the resource.'
    case 503:
      return 'The backend is unavailable. It may be starting up or under maintenance.'
    default:
      return `The request failed with status ${status}.`
  }
}

export { client }
