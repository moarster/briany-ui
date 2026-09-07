import { Dialog } from 'radix-ui'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { CornerDownLeft, LayoutGrid, Plus, Rocket, Search, Workflow } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { listModelerAppsOptions, listProcessesOptions } from '../../api'
import { cx } from '../../lib/cx'
import { useUiStore } from '../ui-store'

type Command = {
  id: string
  label: string
  hint?: string
  icon: ReactNode
  group: string
  run: () => void
}

/**
 * Cmd/Ctrl+K. In a dense tool this is the fastest path to anything, and it costs almost
 * nothing on top of the queries the sections already run.
 */
export function CommandPalette() {
  const open = useUiStore((state) => state.commandPaletteOpen)
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  // Typing changes the result set, so the highlight has to fall back to the first row.
  // Derived during render rather than in an effect, which would cost a second pass.
  const [highlightedFor, setHighlightedFor] = useState(query)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  // Only fetched while the palette is open, so it costs nothing the rest of the time.
  const { data: apps } = useQuery({
    ...listModelerAppsOptions({ query: { size: 100 } }),
    enabled: open,
  })
  const { data: definitions } = useQuery({
    ...listProcessesOptions({ query: { size: 100 } }),
    enabled: open,
  })

  const commands = useMemo<Command[]>(() => {
    const close = () => {
      setOpen(false)
      setQuery('')
    }
    const list: Command[] = [
      {
        id: 'go:applications',
        label: 'Go to Applications',
        icon: <LayoutGrid className="size-3.5" aria-hidden />,
        group: 'Navigate',
        run: () => {
          close()
          void navigate({ to: '/applications' })
        },
      },
      {
        id: 'go:processes',
        label: 'Go to Processes',
        icon: <Workflow className="size-3.5" aria-hidden />,
        group: 'Navigate',
        run: () => {
          close()
          void navigate({ to: '/processes' })
        },
      },
      {
        id: 'new:application',
        label: 'New application',
        icon: <Plus className="size-3.5" aria-hidden />,
        group: 'Create',
        run: () => {
          close()
          void navigate({ to: '/applications', search: { create: true } })
        },
      },
    ]

    for (const app of apps?.data ?? []) {
      list.push({
        id: `app:${app.key}`,
        label: app.name ?? app.key,
        hint: app.key,
        icon: <LayoutGrid className="size-3.5 text-[var(--type-process)]" aria-hidden />,
        group: 'Applications',
        run: () => {
          close()
          void navigate({ to: '/applications/$appKey', params: { appKey: app.key } })
        },
      })
      list.push({
        id: `deploy:${app.key}`,
        label: `Deploy ${app.name ?? app.key}`,
        hint: app.key,
        icon: <Rocket className="size-3.5" aria-hidden />,
        group: 'Deploy',
        run: () => {
          close()
          void navigate({
            to: '/applications/$appKey',
            params: { appKey: app.key },
            search: { deploy: true },
          })
        },
      })
    }

    for (const definition of definitions?.data ?? []) {
      list.push({
        id: `definition:${definition.key}`,
        label: definition.name ?? definition.key,
        hint: definition.key,
        icon: <Workflow className="size-3.5 text-[var(--type-process)]" aria-hidden />,
        group: 'Process definitions',
        run: () => {
          close()
          void navigate({ to: '/processes/$key', params: { key: definition.key } })
        },
      })
    }

    return list
  }, [apps, definitions, navigate, setOpen])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = needle
      ? commands.filter(
          (command) =>
            command.label.toLowerCase().includes(needle) ||
            command.hint?.toLowerCase().includes(needle),
        )
      : commands
    return matches.slice(0, 40)
  }, [commands, query])

  if (highlightedFor !== query) {
    setHighlightedFor(query)
    setHighlighted(0)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/50" />
        <Dialog.Content
          aria-label="Command palette"
          className="glass fixed left-1/2 top-24 z-[var(--z-modal)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-[var(--radius-xl)] shadow-[var(--shadow-3)]"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-3">
            <Search className="size-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setHighlighted((current) => Math.min(current + 1, filtered.length - 1))
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setHighlighted((current) => Math.max(current - 1, 0))
                }
                if (event.key === 'Enter') {
                  event.preventDefault()
                  filtered[highlighted]?.run()
                }
              }}
              placeholder="Jump to an application, a definition, or run a command"
              className="h-11 w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">
                Nothing matches.
              </li>
            )}
            {filtered.map((command, index) => (
              <li key={command.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={command.run}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-xs',
                    index === highlighted
                      ? 'bg-[var(--surface-3)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)]',
                  )}
                >
                  {command.icon}
                  <span className="min-w-0 flex-1 truncate">{command.label}</span>
                  {command.hint && (
                    <span className="shrink-0 font-[family-name:var(--font-mono)] text-2xs text-[var(--text-muted)]">
                      {command.hint}
                    </span>
                  )}
                  <span className="shrink-0 text-2xs uppercase tracking-wide text-[var(--text-muted)]">
                    {command.group}
                  </span>
                  {index === highlighted && (
                    <CornerDownLeft className="size-3 shrink-0" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
