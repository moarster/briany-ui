import { Link } from '@tanstack/react-router'
import { MoreVertical, Rocket } from 'lucide-react'
import type { ModelerAppRef } from '../../api'
import {
  Badge,
  Button,
  FileTypeIcon,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  RelativeTime,
  SeverityIcon,
  Tooltip,
  WorkspaceStatePill,
} from '../../design/components'
import { cx } from '../../lib/cx'
import { t } from '../../lib/i18n'

/**
 * The tile answers, in this order: what is this, does what runs match what I edited, what
 * is in it, and is anything running. The state pill is the most important element on it.
 */
export function ApplicationTile({
  app,
  hasErrors = false,
  onDeploy,
  onUndeploy,
  onDelete,
}: {
  app: ModelerAppRef
  hasErrors?: boolean
  onDeploy: () => void
  onUndeploy: () => void
  onDelete: () => void
}) {
  const stats = app.stats
  const instances = stats?.instances
  const deployed = app.deployedVersion !== undefined && app.deployedAt !== undefined

  return (
    <article className="glass group relative flex flex-col gap-3 rounded-[var(--radius-lg)] p-4 transition-shadow duration-[var(--duration-2)] hover:shadow-[var(--shadow-3)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to="/applications/$appKey"
            params={{ appKey: app.key }}
            className="block truncate text-md font-semibold text-[var(--text-primary)] hover:text-[var(--color-primary)]"
          >
            {app.name ?? app.key}
            {/* Stretches the link over the whole tile without nesting interactive elements. */}
            <span className="absolute inset-0" aria-hidden />
          </Link>
          <p className="truncate font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
            {app.key}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasErrors && (
            <Tooltip content="This application has files with errors.">
              <span className="relative z-10 flex">
                <SeverityIcon severity="error" />
              </span>
            </Tooltip>
          )}
          <WorkspaceStatePill state={app.state} />
        </div>
      </div>

      {stats && (
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          <Composition type="bpmn" count={stats.processDefinitions} />
          <Composition type="dmn" count={stats.decisions} />
          <Composition type="bform" count={stats.forms} />
        </div>
      )}

      {/* An empty chart on a never-deployed application is noise, so it is suppressed. */}
      {deployed && instances && instances.total > 0 && (
        <InstanceBar
          running={instances.running}
          completed={instances.completed}
          suspended={instances.suspended}
        />
      )}

      <footer className="mt-auto flex items-center justify-between gap-2 pt-1">
        <p className="truncate text-2xs text-[var(--text-muted)]">
          {deployed ? (
            <>
              v{app.deployedVersion} . <RelativeTime value={app.deployedAt} />
            </>
          ) : (
            t('applications.neverDeployed')
          )}
        </p>

        <div className="relative z-10 flex items-center gap-1 opacity-0 transition-opacity duration-[var(--duration-1)] group-focus-within:opacity-100 group-hover:opacity-100">
          <Button
            size="sm"
            variant="ghost"
            icon={<Rocket className="size-3.5" aria-hidden />}
            onClick={onDeploy}
          >
            {app.state === 'ahead' ? t('applications.deployChanges') : t('applications.deploy')}
          </Button>
          <Menu
            trigger={
              <IconButton
                size="sm"
                showTooltip={false}
                label={t('common.more')}
                icon={<MoreVertical className="size-3.5" aria-hidden />}
              />
            }
          >
            <MenuItem onSelect={onUndeploy} disabled={!deployed}>
              {t('applications.undeploy')}
            </MenuItem>
            <MenuSeparator />
            <MenuItem destructive onSelect={onDelete}>
              {t('common.delete')}
            </MenuItem>
          </Menu>
        </div>
      </footer>
    </article>
  )
}

function Composition({ type, count }: { type: 'bpmn' | 'dmn' | 'bform'; count: number }) {
  return (
    <span className={cx('flex items-center gap-1 tabular', count === 0 && 'opacity-40')}>
      <FileTypeIcon type={type} className="size-3.5" />
      {count}
    </span>
  )
}

/** Running versus completed at a glance; the running count is the number that matters. */
function InstanceBar({
  running,
  completed,
  suspended,
}: {
  running: number
  completed: number
  suspended: number
}) {
  const total = Math.max(1, running + completed + suspended)
  const segment = (value: number) => `${(value / total) * 100}%`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-1.5 overflow-hidden rounded-[var(--radius-full)] bg-[var(--surface-3)]">
        <span
          className="bg-[var(--color-accent)]"
          style={{ width: segment(running) }}
          aria-hidden
        />
        <span
          className="bg-[var(--color-primary)]"
          style={{ width: segment(completed) }}
          aria-hidden
        />
        <span
          className="bg-[var(--color-warning)]"
          style={{ width: segment(suspended) }}
          aria-hidden
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-2xs">
        <Badge tone="accent">{running} running</Badge>
        <span className="tabular text-[var(--text-muted)]">{completed} completed</span>
        {suspended > 0 && (
          <span className="tabular text-[var(--color-warning)]">{suspended} suspended</span>
        )}
      </div>
    </div>
  )
}
