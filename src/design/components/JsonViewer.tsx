import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cx } from '../../lib/cx'

/**
 * Renders a JSON value as a collapsible tree. A variable holding an object is common
 * enough that truncating it to one line loses the only thing the operator opened the page
 * to see.
 */
export function JsonViewer({ value, className }: { value: unknown; className?: string }) {
  return (
    <div className={cx('font-[family-name:var(--font-mono)] text-xs leading-5', className)}>
      <Node value={value} depth={0} />
    </div>
  )
}

function Node({ value, name, depth }: { value: unknown; name?: string; depth: number }) {
  // Deeply nested structures start collapsed, so a large variable does not flood the pane.
  const [open, setOpen] = useState(depth < 2)

  if (value === null) return <Leaf name={name} text="null" tone="muted" />
  if (typeof value === 'string') return <Leaf name={name} text={`"${value}"`} tone="string" />
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <Leaf name={name} text={String(value)} tone="scalar" />
  }

  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value as Record<string, unknown>)
  const [openBrace, closeBrace] = Array.isArray(value) ? ['[', ']'] : ['{', '}']

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1 hover:text-[var(--text-primary)]"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="size-3" aria-hidden />
        ) : (
          <ChevronRight className="size-3" aria-hidden />
        )}
        {name !== undefined && <span className="text-[var(--color-info)]">{name}:</span>}
        <span className="text-[var(--text-muted)]">
          {openBrace}
          {open ? '' : ` ${entries.length} `}
          {open ? '' : closeBrace}
        </span>
      </button>
      {open && (
        <>
          <div className="ml-3 border-l border-[var(--border-subtle)] pl-2">
            {entries.map(([key, item]) => (
              <Node key={key} name={key} value={item} depth={depth + 1} />
            ))}
          </div>
          <span className="ml-1 text-[var(--text-muted)]">{closeBrace}</span>
        </>
      )}
    </div>
  )
}

const tones = {
  muted: 'text-[var(--text-muted)]',
  string: 'text-[var(--color-primary)]',
  scalar: 'text-[var(--color-accent)]',
} as const

function Leaf({ name, text, tone }: { name?: string; text: string; tone: keyof typeof tones }) {
  return (
    <div className="pl-4">
      {name !== undefined && <span className="text-[var(--color-info)]">{name}: </span>}
      <span className={cx('break-all', tones[tone])}>{text}</span>
    </div>
  )
}
