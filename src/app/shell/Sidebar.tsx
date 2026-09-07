import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  CheckSquare,
  LayoutGrid,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  Workflow,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { getCurrentUserOptions } from '../../api'
import { useAuthStore } from '../../features/auth/store'
import { Avatar, IconButton, Tooltip } from '../../design/components'
import { cx } from '../../lib/cx'
import { t } from '../../lib/i18n'
import { runtimeConfig } from '../../lib/runtime-config'
import { setThemePreference, useTheme } from '../../lib/theme'
import { useUiStore } from '../ui-store'

const sections = [
  { to: '/applications', label: t('nav.applications'), Icon: LayoutGrid },
  { to: '/processes', label: t('nav.processes'), Icon: Workflow },
  { to: '/tasks', label: t('nav.tasks'), Icon: CheckSquare },
] as const

export function Sidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggle = useUiStore((state) => state.toggleSidebar)
  const { resolved } = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signOut = useAuthStore((state) => state.signOut)
  const fallbackName = useAuthStore((state) => state.credential?.username ?? '')

  const { data: user } = useQuery({
    ...getCurrentUserOptions(),
    staleTime: Number.POSITIVE_INFINITY,
  })
  const displayName = user?.displayName ?? fallbackName

  return (
    <aside
      className={cx(
        'glass z-[var(--z-sticky)] flex shrink-0 flex-col rounded-none border-y-0 border-l-0',
        'transition-[width] duration-[var(--duration-2)] ease-[var(--ease-out)]',
        collapsed ? 'w-14' : 'w-52',
      )}
    >
      <div
        className={cx(
          'flex h-12 shrink-0 items-center gap-2',
          collapsed ? 'justify-center px-2' : 'px-3',
        )}
      >
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-2xs font-bold text-[var(--text-on-primary)]"
        >
          B
        </span>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {runtimeConfig().productName}
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Sections">
        {sections.map(({ to, label, Icon }) => (
          <Tooltip key={to} content={collapsed ? label : ''} side="right">
            <Link
              to={to}
              className={cx(
                'flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium',
                'text-[var(--text-secondary)] transition-colors duration-[var(--duration-1)]',
                'hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]',
                collapsed && 'justify-center px-0',
              )}
              activeProps={{
                className: 'bg-[var(--color-primary-soft)] !text-[var(--color-primary)]',
              }}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          </Tooltip>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-[var(--border-subtle)] p-2">
        {displayName && (
          <div
            className={cx('flex items-center gap-2 px-1 py-1', collapsed && 'justify-center px-0')}
          >
            <Avatar name={displayName} />
            {!collapsed && (
              <span className="truncate text-xs text-[var(--text-secondary)]">{displayName}</span>
            )}
          </div>
        )}
        <div className={cx('flex items-center gap-1', collapsed ? 'flex-col' : 'justify-between')}>
          <div className="flex items-center gap-1">
            <IconButton
              size="sm"
              label={t('nav.theme')}
              onClick={() => setThemePreference(resolved === 'dark' ? 'light' : 'dark')}
              icon={
                resolved === 'dark' ? (
                  <Sun className="size-3.5" aria-hidden />
                ) : (
                  <Moon className="size-3.5" aria-hidden />
                )
              }
            />
            <Link to="/settings" aria-label={t('nav.settings')}>
              <IconButton
                size="sm"
                label={t('nav.settings')}
                showTooltip={false}
                icon={<Settings className="size-3.5" aria-hidden />}
              />
            </Link>
            <IconButton
              size="sm"
              label={t('nav.signOut')}
              onClick={() => {
                signOut()
                queryClient.clear()
                void navigate({ to: '/login', replace: true })
              }}
              icon={<LogOut className="size-3.5" aria-hidden />}
            />
          </div>
          <IconButton
            size="sm"
            label={collapsed ? t('nav.expand') : t('nav.collapse')}
            onClick={toggle}
            icon={
              collapsed ? (
                <PanelLeftOpen className="size-3.5" aria-hidden />
              ) : (
                <PanelLeftClose className="size-3.5" aria-hidden />
              )
            }
          />
        </div>
      </div>
    </aside>
  )
}
