import { Popover } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Input } from './Input'
import { SeverityIcon } from './SeverityIcon'
import { Tooltip } from './Tooltip'

export type ComboboxOption = {
  value: string
  label: string
  hint?: string
}

export type ComboboxGroup = {
  label: string
  options: ComboboxOption[]
}

/**
 * Grouped, async-friendly, and accepts free text. Free text matters: a form key may be
 * deployed by another application later, so a value matching nothing is a warning, not an
 * error the picker refuses to hold.
 */
export function Combobox({
  value,
  onChange,
  groups,
  placeholder = 'Select or type...',
  loading = false,
  /** Rendered inside the popover under the list - "Create form in this application". */
  actions,
  unresolvedWarning,
  id,
  disabled,
  className,
}: {
  value: string
  onChange: (value: string) => void
  groups: ComboboxGroup[]
  placeholder?: string
  loading?: boolean
  actions?: ReactNode
  unresolvedWarning?: string
  id?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)

  const known = useMemo(
    () => new Set(groups.flatMap((group) => group.options.map((option) => option.value))),
    [groups],
  )
  const unresolved = value !== '' && !known.has(value)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return groups
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter(
          (option) =>
            option.value.toLowerCase().includes(needle) ||
            option.label.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.options.length > 0)
  }, [groups, query])

  const commit = (next: string) => {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          className={cx(
            'inline-flex h-[var(--control-height-md)] w-full items-center justify-between gap-2',
            'rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-inset)] px-2',
            'text-left text-sm hover:border-[var(--border-strong)] disabled:opacity-60',
            className,
          )}
        >
          <span
            className={cx(
              'truncate',
              value ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
            )}
          >
            {value || placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {unresolved && unresolvedWarning && (
              <Tooltip content={unresolvedWarning}>
                <span className="flex">
                  <SeverityIcon severity="warning" />
                </span>
              </Tooltip>
            )}
            <ChevronDown className="size-3.5 text-[var(--text-muted)]" aria-hidden />
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="glass z-[var(--z-overlay)] w-[var(--radix-popover-trigger-width)] min-w-64 rounded-[var(--radius-md)] p-1 shadow-[var(--shadow-2)]"
        >
          <Input
            autoFocus
            value={query}
            placeholder="Filter or type a value"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // A typed value that matches nothing is still a legitimate value.
              if (event.key === 'Enter' && query.trim()) {
                event.preventDefault()
                commit(query.trim())
              }
            }}
            className="mb-1"
          />
          <div className="max-h-64 overflow-y-auto">
            {loading && <p className="px-2 py-3 text-xs text-[var(--text-muted)]">Loading...</p>}
            {!loading && filtered.length === 0 && (
              <p className="px-2 py-3 text-xs text-[var(--text-muted)]">
                {query
                  ? 'No match. Press Enter to use this value as typed.'
                  : 'Nothing to choose from yet.'}
              </p>
            )}
            {filtered.map((group) => (
              <div key={group.label} className="mb-1">
                <p className="px-2 py-1 text-2xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  {group.label}
                </p>
                {group.options.map((option) => (
                  <button
                    key={`${group.label}:${option.value}`}
                    type="button"
                    onClick={() => commit(option.value)}
                    className={cx(
                      'flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left',
                      'text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-[family-name:var(--font-mono)]">
                        {option.value}
                      </span>
                      {option.hint && (
                        <span className="block truncate text-[var(--text-muted)]">
                          {option.hint}
                        </span>
                      )}
                    </span>
                    {option.value === value && (
                      <Check
                        className="size-3.5 shrink-0 text-[var(--color-primary)]"
                        aria-hidden
                      />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
          {actions && (
            <div className="mt-1 border-t border-[var(--border-default)] pt-1">{actions}</div>
          )}
          {value && (
            <div className="mt-1 border-t border-[var(--border-default)] pt-1">
              <button
                type="button"
                onClick={() => commit('')}
                className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
              >
                Clear
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
