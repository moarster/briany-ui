import { createFileRoute } from '@tanstack/react-router'
import { Card, RadioGroup, Switch } from '../../../design/components'
import { t } from '../../../lib/i18n'
import { runtimeConfig } from '../../../lib/runtime-config'
import { setGlass, setThemePreference, useTheme } from '../../../lib/theme'
import { TopBar } from '../../shell/TopBar'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})

/**
 * Shortcuts are documented here rather than only being discoverable, because the BPMN
 * canvas is not keyboard-navigable on its own and an operator needs to know what is
 * available.
 */
const shortcuts: { keys: string; action: string }[] = [
  { keys: 'Cmd/Ctrl + K', action: 'Open the command palette' },
  { keys: 'Cmd/Ctrl + S', action: 'Save the active editor or the README' },
  { keys: 'Middle click', action: 'Close an editor tab' },
  { keys: 'Space + drag', action: 'Pan the BPMN canvas' },
  { keys: 'Cmd/Ctrl + scroll', action: 'Zoom the BPMN canvas' },
  { keys: 'Cmd/Ctrl + Z / Shift + Z', action: 'Undo and redo in a modeler' },
  { keys: 'Arrow keys', action: 'Move the selected element on the canvas' },
  { keys: 'Delete', action: 'Remove the selected element' },
]

function SettingsPage() {
  const { preference, glass } = useTheme()
  const config = runtimeConfig()

  return (
    <>
      <TopBar crumbs={[{ label: t('settings.title') }]} />

      <main className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              {t('settings.appearance')}
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
                  {t('settings.theme')}
                </p>
                <RadioGroup
                  value={preference}
                  onValueChange={setThemePreference}
                  options={[
                    { value: 'dark', label: 'Dark', hint: 'The default for this console.' },
                    { value: 'light', label: 'Light' },
                    { value: 'system', label: 'Match the system' },
                  ]}
                />
              </div>

              <div>
                <Switch
                  id="glass"
                  checked={glass}
                  onCheckedChange={setGlass}
                  label={t('settings.glass')}
                />
                <p className="mt-1.5 pl-[46px] text-xs text-[var(--text-muted)]">
                  {t('settings.glassDetail')}
                  {!config.features.glass &&
                    ' This deployment has translucency disabled in its runtime configuration.'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              {t('settings.shortcuts')}
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              {shortcuts.map((shortcut) => (
                <div key={shortcut.keys} className="contents">
                  <dt>
                    <kbd className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-inset)] px-1.5 py-0.5 text-2xs text-[var(--text-secondary)]">
                      {shortcut.keys}
                    </kbd>
                  </dt>
                  <dd className="text-[var(--text-secondary)]">{shortcut.action}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              {t('settings.about')}
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              <dt className="text-[var(--text-muted)]">Product</dt>
              <dd className="text-[var(--text-secondary)]">{config.productName}</dd>
              <dt className="text-[var(--text-muted)]">API</dt>
              <dd className="font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
                {/* An empty prefix means same-origin, which is the common deployment. */}
                {config.apiBaseUrl === '' ? 'Same origin' : config.apiBaseUrl}
              </dd>
              <dt className="text-[var(--text-muted)]">Authentication</dt>
              <dd className="text-[var(--text-secondary)]">HTTP Basic against Flowable IDM</dd>
            </dl>
          </Card>
        </div>
      </main>
    </>
  )
}
