import { Tooltip as RadixTooltip } from 'radix-ui'
import type { ReactElement, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={400} skipDelayDuration={200}>
      {children}
    </RadixTooltip.Provider>
  )
}

export type TooltipProps = {
  content: ReactNode
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Long values (ids, hashes) wrap instead of stretching the tooltip off screen. */
  wide?: boolean
}

export function Tooltip({ content, children, side = 'top', wide = false }: TooltipProps) {
  if (content === null || content === undefined || content === '') return children
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className={cx(
            'glass z-[var(--z-overlay)] rounded-[var(--radius-sm)] px-2 py-1',
            'text-xs text-[var(--text-primary)]',
            wide ? 'max-w-96 break-all font-[family-name:var(--font-mono)]' : 'max-w-64',
          )}
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
