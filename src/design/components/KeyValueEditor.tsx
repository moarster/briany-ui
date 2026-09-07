import { Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { Input } from './Input'
import { Select } from './Select'

export type VariableKind = 'string' | 'number' | 'boolean' | 'json'

export type VariableEntry = {
  name: string
  kind: VariableKind
  value: string
}

const kinds: { value: VariableKind; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'json', label: 'JSON' },
]

/**
 * The typed variable editor. It is the fallback wherever a form is absent: starting an
 * instance of a definition with no start form, and completing a task with no `formKey`.
 * Plenty of user tasks have no form, so this is a first-class surface, not a stopgap.
 */
export function KeyValueEditor({
  entries,
  onChange,
  readOnly = false,
  nameLabel = 'Name',
}: {
  entries: VariableEntry[]
  onChange: (entries: VariableEntry[]) => void
  readOnly?: boolean
  nameLabel?: string
}) {
  const id = useId()

  const update = (index: number, patch: Partial<VariableEntry>) => {
    onChange(
      entries.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)),
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[1fr_7rem_1.4fr_auto] gap-2 px-0.5 text-2xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        <span>{nameLabel}</span>
        <span>Type</span>
        <span>Value</span>
        <span className="sr-only">Actions</span>
      </div>
      {entries.map((entry, index) => (
        <div
          key={`${id}-${index}`}
          className="grid grid-cols-[1fr_7rem_1.4fr_auto] items-center gap-2"
        >
          <Input
            mono
            value={entry.name}
            readOnly={readOnly}
            aria-label={`${nameLabel} ${index + 1}`}
            onChange={(event) => update(index, { name: event.target.value })}
          />
          <Select
            value={entry.kind}
            aria-label={`Type ${index + 1}`}
            disabled={readOnly}
            options={kinds}
            onValueChange={(kind) => update(index, { kind })}
          />
          {entry.kind === 'boolean' ? (
            <Select
              value={entry.value === 'true' ? 'true' : 'false'}
              aria-label={`Value ${index + 1}`}
              disabled={readOnly}
              options={[
                { value: 'true', label: 'true' },
                { value: 'false', label: 'false' },
              ]}
              onValueChange={(value) => update(index, { value })}
            />
          ) : (
            <Input
              mono={entry.kind === 'json'}
              value={entry.value}
              readOnly={readOnly}
              aria-label={`Value ${index + 1}`}
              onChange={(event) => update(index, { value: event.target.value })}
            />
          )}
          {readOnly ? (
            <span />
          ) : (
            <IconButton
              size="sm"
              tone="danger"
              label={`Remove ${entry.name || `variable ${index + 1}`}`}
              icon={<Trash2 className="size-3.5" aria-hidden />}
              onClick={() => onChange(entries.filter((_, position) => position !== index))}
            />
          )}
        </div>
      ))}
      {!readOnly && (
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          icon={<Plus className="size-3.5" aria-hidden />}
          onClick={() => onChange([...entries, { name: '', kind: 'string', value: '' }])}
        >
          Add variable
        </Button>
      )}
    </div>
  )
}

/** Turns the editor's rows into the `variables` map the API expects. */
export function toVariableMap(entries: VariableEntry[]): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const entry of entries) {
    const name = entry.name.trim()
    if (!name) continue
    map[name] = parseValue(entry)
  }
  return map
}

function parseValue(entry: VariableEntry): unknown {
  switch (entry.kind) {
    case 'number': {
      const parsed = Number(entry.value)
      return Number.isFinite(parsed) ? parsed : entry.value
    }
    case 'boolean':
      return entry.value === 'true'
    case 'json':
      try {
        return JSON.parse(entry.value) as unknown
      } catch {
        // An unparseable value is sent as typed; the server rejects it with a Problem,
        // which says more than a client-side "invalid JSON" ever could.
        return entry.value
      }
    default:
      return entry.value
  }
}

export function fromVariableMap(map: Record<string, unknown>): VariableEntry[] {
  return Object.entries(map).map(([name, value]) => {
    if (typeof value === 'number') return { name, kind: 'number' as const, value: String(value) }
    if (typeof value === 'boolean') return { name, kind: 'boolean' as const, value: String(value) }
    if (typeof value === 'string') return { name, kind: 'string' as const, value }
    return { name, kind: 'json' as const, value: JSON.stringify(value, null, 2) }
  })
}
