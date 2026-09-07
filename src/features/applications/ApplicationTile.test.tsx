import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ModelerAppRef } from '../../api'
import { ApplicationTile } from './ApplicationTile'
import { renderWithProviders } from '../../../tests/render'

const base: ModelerAppRef = {
  id: '11111111-1111-1111-1111-111111111111',
  key: 'orders',
  name: 'Order management',
  state: 'draft',
}

const noop = () => {}

describe('ApplicationTile', () => {
  it('shows the state pill with a label, never colour alone', async () => {
    await renderWithProviders(
      <ApplicationTile app={base} onDeploy={noop} onUndeploy={noop} onDelete={noop} />,
    )
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('says the application has never been deployed rather than showing an empty version', async () => {
    await renderWithProviders(
      <ApplicationTile app={base} onDeploy={noop} onUndeploy={noop} onDelete={noop} />,
    )
    expect(screen.getByText('Never deployed')).toBeInTheDocument()
  })

  it('renders the key in full, because operators paste it into log queries', async () => {
    await renderWithProviders(
      <ApplicationTile app={base} onDeploy={noop} onUndeploy={noop} onDelete={noop} />,
    )
    expect(screen.getByText('orders')).toBeInTheDocument()
  })

  it('shows file composition counters when stats are present', async () => {
    await renderWithProviders(
      <ApplicationTile
        app={{ ...base, stats: { processDefinitions: 2, decisions: 1, forms: 3 } }}
        onDeploy={noop}
        onUndeploy={noop}
        onDelete={noop}
      />,
    )
    expect(screen.getByLabelText('Process')).toBeInTheDocument()
    expect(screen.getByLabelText('Decision')).toBeInTheDocument()
    expect(screen.getByLabelText('Form')).toBeInTheDocument()
  })

  it('suppresses the runtime bar on a draft, where an empty chart would be noise', async () => {
    await renderWithProviders(
      <ApplicationTile
        app={{
          ...base,
          stats: {
            processDefinitions: 1,
            decisions: 0,
            forms: 0,
            instances: { running: 0, completed: 0, suspended: 0, total: 0 },
          },
        }}
        onDeploy={noop}
        onUndeploy={noop}
        onDelete={noop}
      />,
    )
    expect(screen.queryByText(/running/)).not.toBeInTheDocument()
  })

  it('shows running and completed counts once the application is deployed', async () => {
    await renderWithProviders(
      <ApplicationTile
        app={{
          ...base,
          state: 'synced',
          deployedVersion: 3,
          deployedAt: new Date(Date.now() - 7_200_000).toISOString(),
          stats: {
            processDefinitions: 1,
            decisions: 0,
            forms: 0,
            instances: { running: 12, completed: 340, suspended: 1, total: 353 },
          },
        }}
        onDeploy={noop}
        onUndeploy={noop}
        onDelete={noop}
      />,
    )
    expect(screen.getByText('12 running')).toBeInTheDocument()
    expect(screen.getByText('340 completed')).toBeInTheDocument()
    expect(screen.getByText(/v3/)).toBeInTheDocument()
  })

  it('labels the deploy control by sync state, so it says what it will do', async () => {
    const onDeploy = vi.fn()
    await renderWithProviders(
      <ApplicationTile
        app={{ ...base, state: 'ahead' }}
        onDeploy={onDeploy}
        onUndeploy={noop}
        onDelete={noop}
      />,
    )
    const button = screen.getByRole('button', { name: /Deploy changes/ })
    await userEvent.click(button)
    expect(onDeploy).toHaveBeenCalledOnce()
  })

  it('flags files with errors, so a broken application is visible in the grid', async () => {
    await renderWithProviders(
      <ApplicationTile app={base} hasErrors onDeploy={noop} onUndeploy={noop} onDelete={noop} />,
    )
    expect(screen.getByRole('img', { name: 'Error' })).toBeInTheDocument()
  })
})
