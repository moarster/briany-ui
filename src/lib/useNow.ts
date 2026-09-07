import { useEffect, useState } from 'react'

/**
 * The current time as state, refreshed on an interval. An overdue badge has to change when
 * the deadline passes, not when the list happens to refetch, and reading `Date.now()`
 * during render would make the component impure.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}
