import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import type { DeployErrorTarget } from '../../api'
import { IconButton, SeverityIcon } from '../../design/components'
import { t } from '../../lib/i18n'

/**
 * The single most valuable interaction in this section: each row names the file the
 * engine rejected and, where it reported one, the element, and clicking it opens that
 * file's editor with the element selected.
 */
export function DeployFailurePanel({
  appKey,
  detail,
  failures,
  onDismiss,
}: {
  appKey: string
  detail: string | null
  failures: DeployErrorTarget[]
  onDismiss: () => void
}) {
  return (
    <section
      role="alert"
      aria-live="assertive"
      className="rounded-[var(--radius-md)] border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] p-3"
    >
      <div className="flex items-start gap-2.5">
        <SeverityIcon severity="error" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {t('applications.deployFailed')}
          </h3>
          {detail && <p className="mt-1 text-xs text-[var(--text-secondary)]">{detail}</p>}

          {failures.length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-1">
              {failures.map((failure, index) => (
                <li key={`${failure.fileKey}-${failure.elementId ?? ''}-${index}`}>
                  <Link
                    to="/applications/$appKey/files/$fileKey"
                    params={{ appKey, fileKey: failure.fileKey }}
                    search={failure.elementId ? { element: failure.elementId } : undefined}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-[var(--radius-sm)] px-1.5 py-1 text-xs hover:bg-[var(--surface-2)]"
                  >
                    <span className="font-[family-name:var(--font-mono)] text-[var(--color-danger)]">
                      {failure.fileKey}
                      {failure.elementId && (
                        <span className="text-[var(--text-muted)]">#{failure.elementId}</span>
                      )}
                    </span>
                    <span className="text-[var(--text-secondary)]">{failure.message}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <IconButton
          size="sm"
          label={t('common.close')}
          onClick={onDismiss}
          icon={<X className="size-3.5" aria-hidden />}
        />
      </div>
    </section>
  )
}
