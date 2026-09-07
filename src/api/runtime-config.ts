import type { CreateClientConfig } from './generated/client.gen'
import { runtimeConfig } from '../lib/runtime-config'

/**
 * Applied by the generated client at construction time. Only what has to be known before
 * the first request lives here; the auth header and the problem+json mapping are
 * interceptors installed in `client.ts`, because they depend on stores this module must
 * not import.
 */
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: runtimeConfig().apiBaseUrl,
  // Every failure leaves the client as a rejected promise carrying a ProblemError.
  throwOnError: true,
})
