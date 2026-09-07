import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Badge, SeverityIcon } from '../../design/components'
import { cx } from '../../lib/cx'
import { t } from '../../lib/i18n'
import type { EditorProblem } from './types'

const sourceLabel: Record<EditorProblem['source'], string> = {
  lint: 'Lint',
  server: 'Server',
  deploy: 'Last deploy',
}

/**
 * The collapsible bottom panel. It merges client lint, the server's stored file errors,
 * and the last deploy's rejection for this file, because from the author's point of view
 * they are all the same question: what is wrong with this file.
 */
export function ProblemsDrawer({
  problems,
  onSelect,
}: {
  problems: EditorProblem[]
  onSelect?: (problem: EditorProblem) => void
}) {
  const [open, setOpen] = useState(false)
  const errors = problems.filter((problem) => problem.severity === 'error').length
  const warnings = problems.filter((problem) => problem.severity === 'warning').length

  return (
    <section className="shrink-0 border-t border-[var(--border-default)] bg-[var(--surface-1)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
      >
        <span className="font-medium">{t('editor.problems')}</span>
        {errors > 0 && (
          <Badge tone="danger" icon={<SeverityIcon severity="error" className="size-3" />}>
            {errors}
          </Badge>
        )}
        {warnings > 0 && (
          <Badge tone="warning" icon={<SeverityIcon severity="warning" className="size-3" />}>
            {warnings}
          </Badge>
        )}
        {problems.length === 0 && (
          <span className="text-[var(--text-muted)]">{t('editor.noProblems')}</span>
        )}
        <span className="ml-auto">
          {open ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronUp className="size-3.5" aria-hidden />
          )}
        </span>
      </button>

      {open && problems.length > 0 && (
        <ul className="max-h-48 overflow-y-auto border-t border-[var(--border-subtle)]">
          {problems.map((problem) => (
            <li key={problem.id}>
              <button
                type="button"
                disabled={!problem.elementId || !onSelect}
                onClick={() => onSelect?.(problem)}
                className={cx(
                  'flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs',
                  problem.elementId && onSelect ? 'hover:bg-[var(--surface-2)]' : 'cursor-default',
                )}
              >
                <SeverityIcon severity={problem.severity} className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="text-[var(--text-secondary)]">{problem.message}</span>
                  {problem.elementId && (
                    <span className="ml-2 font-[family-name:var(--font-mono)] text-[var(--text-muted)]">
                      {problem.elementName
                        ? `${problem.elementName} (${problem.elementId})`
                        : problem.elementId}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-2xs uppercase tracking-wide text-[var(--text-muted)]">
                  {problem.code ?? sourceLabel[problem.source]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
