import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { getCurrentUser, isProblemError } from '../../api'
import { encodeBasic, isAuthenticated, useAuthStore } from '../../features/auth/store'
import { Button, Field, GlassPanel, Input } from '../../design/components'
import { t } from '../../lib/i18n'
import { runtimeConfig } from '../../lib/runtime-config'

const searchSchema = z.object({ redirect: z.string().optional() })

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (isAuthenticated()) throw redirect({ to: search.redirect ?? '/applications' })
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: intended } = Route.useSearch()
  const signIn = useAuthStore((state) => state.signIn)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    const header = encodeBasic(username, password)
    // Store first, because the request interceptor reads the credential from the store;
    // a failure clears it again below.
    signIn({ username, header })

    try {
      const { data } = await getCurrentUser()
      signIn({ username: data?.displayName ?? username, header })
      await navigate({ to: intended ?? '/applications', replace: true })
    } catch (failure) {
      useAuthStore.getState().signOut()
      setError(
        isProblemError(failure) && failure.status !== 401 ? failure.detail : t('auth.failed'),
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--surface-0)] p-4">
      <GlassPanel className="w-full max-w-sm p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {runtimeConfig().productName}
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('auth.subtitle')}</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label={t('auth.username')} htmlFor="username" required>
            <Input
              id="username"
              autoFocus
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </Field>
          <Field label={t('auth.password')} htmlFor="password" required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {error && (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-1">
            {pending ? t('auth.signingIn') : t('auth.submit')}
          </Button>
        </form>
      </GlassPanel>
    </main>
  )
}
