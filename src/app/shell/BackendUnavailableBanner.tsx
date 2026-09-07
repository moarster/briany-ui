import { useQueryClient } from '@tanstack/react-query'
import { CloudOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../design/components'
import { t } from '../../lib/i18n'
import { useUiStore } from '../ui-store'

/**
 * A 503 with `Retry-After` is a distinct condition from a generic error: the backend is
 * starting or under maintenance and will be back. Say that, and say when.
 */
export function BackendUnavailableBanner() {
  const until = useUiStore((state) => state.backendUnavailableUntil)
  const clear = useUiStore((state) => state.clearBackendUnavailable)
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (until === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [until])

  if (until === null) return null

  const seconds = Math.max(0, Math.ceil((until - now) / 1000))

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex shrink-0 items-center gap-2 border-b border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)] px-4 py-1.5 text-xs text-[var(--text-primary)]"
    >
      <CloudOff className="size-3.5 shrink-0 text-[var(--color-warning)]" aria-hidden />
      <span className="flex-1">
        {t('error.backendUnavailable')}
        {seconds > 0 ? ` - retrying is worth a shot in ${seconds}s.` : '.'}
      </span>
      <Button
        size="sm"
        onClick={() => {
          clear()
          void queryClient.refetchQueries()
        }}
      >
        {t('common.retry')}
      </Button>
    </div>
  )
}
