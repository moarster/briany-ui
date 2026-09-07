import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import type { ProcessInstanceState } from '../../../api'
import { InstanceTable } from '../../../features/processes/InstanceTable'
import { Button, IconButton, Input, Select, Tooltip } from '../../../design/components'
import { cx } from '../../../lib/cx'
import { t } from '../../../lib/i18n'
import { TopBar } from '../../shell/TopBar'

/**
 * Every filter is a typed search param, so an operator can paste a link to a filtered
 * view. This is the single most valuable Operate behaviour and it costs almost nothing.
 */
const searchSchema = z.object({
  processDefinitionKey: z.string().optional(),
  version: z.number().int().optional(),
  state: z.enum(['running', 'completed', 'suspended']).optional(),
  /** Client-side over the loaded page: instance id and business key. */
  text: z.string().optional(),
  page: z.number().int().min(0).default(0),
  filters: z.boolean().default(true),
})

export const Route = createFileRoute('/_authenticated/processes/instances/')({
  validateSearch: searchSchema,
  component: InstancesPage,
})

function InstancesPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) => {
    void navigate({ search: (current) => ({ ...current, ...patch }), replace: true })
  }

  return (
    <>
      <TopBar
        crumbs={[
          { label: t('processes.title'), to: '/processes' },
          { label: t('processes.instances') },
        ]}
      />

      <main className="flex min-h-0 flex-1">
        <FilterPanel
          open={search.filters}
          onToggle={() => setSearch({ filters: !search.filters })}
          state={search.state}
          processDefinitionKey={search.processDefinitionKey}
          text={search.text}
          onChange={setSearch}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <InstanceTable
            state={search.state}
            processDefinitionKey={search.processDefinitionKey}
            filterText={search.text}
            page={search.page}
            onPageChange={(page) => setSearch({ page })}
          />
        </div>
      </main>
    </>
  )
}

function FilterPanel({
  open,
  onToggle,
  state,
  processDefinitionKey,
  text,
  onChange,
}: {
  open: boolean
  onToggle: () => void
  state?: ProcessInstanceState
  processDefinitionKey?: string
  text?: string
  onChange: (patch: Partial<z.infer<typeof searchSchema>>) => void
}) {
  const [localText, setLocalText] = useState(text ?? '')

  if (!open) {
    return (
      <div className="shrink-0 border-r border-[var(--border-default)] p-2">
        <IconButton
          label="Show filters"
          onClick={onToggle}
          icon={<ChevronRight className="size-4" aria-hidden />}
        />
      </div>
    )
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-3 overflow-y-auto border-r border-[var(--border-default)] p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Filters
        </h2>
        <IconButton
          size="sm"
          label="Hide filters"
          onClick={onToggle}
          icon={<ChevronLeft className="size-3.5" aria-hidden />}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--text-secondary)]">State</span>
        <Select
          value={state ?? 'all'}
          aria-label="Filter by state"
          onValueChange={(value) =>
            onChange({
              state: value === 'all' ? undefined : (value as ProcessInstanceState),
              page: 0,
            })
          }
          options={[
            { value: 'all', label: 'All states' },
            { value: 'running', label: 'Running' },
            { value: 'completed', label: 'Completed' },
            { value: 'suspended', label: 'Suspended' },
          ]}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Process definition key
        </span>
        <Input
          mono
          value={processDefinitionKey ?? ''}
          onChange={(event) =>
            onChange({ processDefinitionKey: event.target.value || undefined, page: 0 })
          }
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Instance id or business key
        </span>
        <Input
          value={localText}
          onChange={(event) => setLocalText(event.target.value)}
          onBlur={() => onChange({ text: localText || undefined })}
        />
        <span className="text-2xs text-[var(--text-muted)]">Matches within the loaded page.</span>
      </label>

      {/*
        Built so the iteration-2 filters slot in as additional fields rather than a
        redesign. They are shown disabled rather than hidden, because pretending they do
        not exist is what makes an operator go looking for them elsewhere.
      */}
      <div className="flex flex-col gap-2 border-t border-[var(--border-default)] pt-3">
        <p className="text-2xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Coming with the next API version
        </p>
        {['Business key', 'Started by', 'Started between', 'Variable'].map((label) => (
          <Tooltip key={label} content="The contract does not expose this filter yet.">
            <label className={cx('flex flex-col gap-1 opacity-50')}>
              <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
              <Input disabled aria-label={label} />
            </label>
          </Tooltip>
        ))}
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="mt-1"
        onClick={() => {
          setLocalText('')
          onChange({ state: undefined, processDefinitionKey: undefined, text: undefined, page: 0 })
        }}
      >
        Clear filters
      </Button>
    </aside>
  )
}
