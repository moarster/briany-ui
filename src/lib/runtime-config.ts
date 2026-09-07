import { z } from 'zod'

/**
 * Runtime configuration, fetched from `/config.json` before the app renders. Deliberately
 * not a build-time env var: one built image has to serve every environment.
 */
export const runtimeConfigSchema = z.object({
  apiBaseUrl: z.string().default('/api'),
  authMode: z.literal('basic').default('basic'),
  productName: z.string().default('Briany'),
  features: z
    .object({
      glass: z.boolean().default(true),
    })
    .default({ glass: true }),
})

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>

const fallback: RuntimeConfig = runtimeConfigSchema.parse({})

let current: RuntimeConfig = fallback

export function runtimeConfig(): RuntimeConfig {
  return current
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch('/config.json', { cache: 'no-cache' })
    if (!response.ok) throw new Error(`config.json responded ${response.status}`)
    current = runtimeConfigSchema.parse(await response.json())
  } catch (error) {
    // A missing or malformed config.json must not stop the app booting: the defaults are
    // the single-origin deployment, which is the common case.
    console.warn('Falling back to the default runtime configuration.', error)
    current = fallback
  }
  return current
}
