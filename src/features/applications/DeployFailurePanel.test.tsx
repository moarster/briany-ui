import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parseDeployErrors } from '../../api'
import { DeployFailurePanel } from './DeployFailurePanel'
import { renderWithProviders } from '../../../tests/render'

/**
 * The deploy failure panel is the single most valuable interaction in Applications: it is
 * what a modeler offers over a ZIP upload, so its links are pinned here.
 */
describe('DeployFailurePanel', () => {
  const failures = parseDeployErrors([
    { field: 'orders', message: 'The process has no start event.' },
    { field: 'orders#ServiceTask_1', message: 'Delegate kvRogue is not allowed.' },
  ])

  it('is a persistent alert, not a toast, so the errors stay readable', async () => {
    await renderWithProviders(
      <DeployFailurePanel
        appKey="app"
        detail="Deployment rejected."
        failures={failures}
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Deployment rejected.')).toBeInTheDocument()
  })

  it('names the file for a file-level error', async () => {
    await renderWithProviders(
      <DeployFailurePanel appKey="app" detail={null} failures={failures} onDismiss={() => {}} />,
    )
    expect(screen.getByText('The process has no start event.')).toBeInTheDocument()
    expect(screen.getAllByText('orders').length).toBeGreaterThan(0)
  })

  it('names the element as well when the engine reported one', async () => {
    await renderWithProviders(
      <DeployFailurePanel appKey="app" detail={null} failures={failures} onDismiss={() => {}} />,
    )
    expect(screen.getByText('#ServiceTask_1')).toBeInTheDocument()
  })

  it('links each row to the offending file, carrying the element as a search param', async () => {
    await renderWithProviders(
      <DeployFailurePanel appKey="app" detail={null} failures={failures} onDismiss={() => {}} />,
    )
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/applications/app/files/orders')
    expect(links[1]).toHaveAttribute('href', '/applications/app/files/orders?element=ServiceTask_1')
  })
})
