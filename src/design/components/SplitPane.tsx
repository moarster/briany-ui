import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

/**
 * A two-pane horizontal split with a draggable divider. The position persists per user
 * under `storageKey`, so the layout an operator settled on survives a reload.
 */
export function SplitPane({
  storageKey,
  left,
  right,
  defaultRatio = 0.32,
  minRatio = 0.18,
  maxRatio = 0.6,
  className,
  label = 'Resize panes',
}: {
  storageKey: string
  left: ReactNode
  right: ReactNode
  defaultRatio?: number
  minRatio?: number
  maxRatio?: number
  className?: string
  label?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState(() => readRatio(storageKey, defaultRatio))
  const [dragging, setDragging] = useState(false)

  const clamp = useCallback(
    (value: number) => Math.min(maxRatio, Math.max(minRatio, value)),
    [minRatio, maxRatio],
  )

  useEffect(() => {
    if (!dragging) return

    const onMove = (event: PointerEvent) => {
      const container = containerRef.current
      if (!container) return
      const bounds = container.getBoundingClientRect()
      setRatio(clamp((event.clientX - bounds.left) / bounds.width))
    }
    const onUp = () => setDragging(false)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, clamp])

  useEffect(() => {
    if (dragging) return
    try {
      localStorage.setItem(storageKey, String(ratio))
    } catch {
      // A browser with storage disabled still gets a working, non-persisted divider.
    }
  }, [dragging, ratio, storageKey])

  return (
    <div ref={containerRef} className={cx('flex min-h-0 min-w-0', className)}>
      <div className="min-w-0 overflow-auto" style={{ flexBasis: `${ratio * 100}%` }}>
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        onPointerDown={() => setDragging(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') setRatio((current) => clamp(current - 0.02))
          if (event.key === 'ArrowRight') setRatio((current) => clamp(current + 0.02))
        }}
        className={cx(
          'w-px shrink-0 cursor-col-resize bg-[var(--border-default)] transition-colors',
          'hover:bg-[var(--color-primary)] hover:shadow-[0_0_0_2px_var(--color-primary-soft)]',
          dragging && 'bg-[var(--color-primary)]',
        )}
      />
      <div className="min-w-0 flex-1 overflow-auto">{right}</div>
    </div>
  )
}

function readRatio(key: string, fallback: number): number {
  try {
    const stored = localStorage.getItem(key)
    const parsed = stored === null ? Number.NaN : Number.parseFloat(stored)
    return Number.isFinite(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}
