import { Link } from '@tanstack/react-router'
import { Download, MoreVertical, Play, Trash2 } from 'lucide-react'
import type { ModelerAppFileSummary } from '../../api'
import {
  Badge,
  FileTypeIcon,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  SeverityIcon,
  WorkspaceStatePill,
} from '../../design/components'
import { t } from '../../lib/i18n'

export function FileCard({
  appKey,
  file,
  onDelete,
  onDownload,
}: {
  appKey: string
  file: ModelerAppFileSummary
  onDelete: () => void
  onDownload: () => void
}) {
  const runtimeAvailable = file.type === 'bpmn' && Boolean(file.engineResourceId)

  return (
    <article className="group relative flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3 transition-[border-color,box-shadow] duration-[var(--duration-1)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-2)]">
      <div className="flex items-start justify-between gap-2">
        <FileTypeIcon type={file.type} />
        <WorkspaceStatePill state={file.state} />
      </div>

      <div className="min-w-0">
        <Link
          to="/applications/$appKey/files/$fileKey"
          params={{ appKey, fileKey: file.fileKey }}
          className="block truncate text-sm font-medium text-[var(--text-primary)] hover:text-[var(--color-primary)]"
        >
          {file.name ?? file.fileKey}
          <span className="absolute inset-0" aria-hidden />
        </Link>
        <p className="truncate font-[family-name:var(--font-mono)] text-2xs text-[var(--text-muted)]">
          {file.fileKey}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {file.errorCount > 0 ? (
          <Badge tone="danger" icon={<SeverityIcon severity="error" className="size-3" />}>
            {file.errorCount}
          </Badge>
        ) : (
          <span />
        )}

        <div className="relative z-10 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
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
            {runtimeAvailable && (
              <>
                <MenuItem icon={<Play className="size-3.5" aria-hidden />}>
                  <Link to="/processes/$key" params={{ key: file.fileKey }} className="w-full">
                    {t('applications.openRuntime')}
                  </Link>
                </MenuItem>
                <MenuSeparator />
              </>
            )}
            <MenuItem icon={<Download className="size-3.5" aria-hidden />} onSelect={onDownload}>
              {t('common.download')}
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              destructive
              icon={<Trash2 className="size-3.5" aria-hidden />}
              onSelect={onDelete}
            >
              {t('common.delete')}
            </MenuItem>
          </Menu>
        </div>
      </div>
    </article>
  )
}
