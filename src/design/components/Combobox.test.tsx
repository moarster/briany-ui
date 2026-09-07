import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Combobox } from './Combobox'
import type { ComboboxGroup } from './Combobox'
import { renderWithProviders } from '../../../tests/render'

const groups: ComboboxGroup[] = [
  { label: 'This application', options: [{ value: 'approveOrder', label: 'Approve order' }] },
  { label: 'Deployed', options: [{ value: 'creditCheck', label: 'Credit check', hint: 'v4' }] },
]

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <Combobox
        value={value}
        onChange={setValue}
        groups={groups}
        unresolvedWarning="No form with this key exists."
      />
      <output data-testid="value">{value}</output>
    </>
  )
}

describe('Combobox', () => {
  it('separates this application from what is already deployed', async () => {
    await renderWithProviders(<Harness />)
    await userEvent.click(screen.getByRole('button'))

    expect(screen.getByText('This application')).toBeInTheDocument()
    expect(screen.getByText('Deployed')).toBeInTheDocument()
    expect(screen.getByText('approveOrder')).toBeInTheDocument()
    expect(screen.getByText('creditCheck')).toBeInTheDocument()
  })

  it('selects an option from a group', async () => {
    await renderWithProviders(<Harness />)
    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByText('creditCheck'))

    expect(screen.getByTestId('value')).toHaveTextContent('creditCheck')
  })

  it('accepts free text, because another application may deploy the form later', async () => {
    await renderWithProviders(<Harness />)
    await userEvent.click(screen.getByRole('button'))
    await userEvent.type(
      screen.getByPlaceholderText('Filter or type a value'),
      'notYetDeployed{Enter}',
    )

    expect(screen.getByTestId('value')).toHaveTextContent('notYetDeployed')
  })

  it('warns on a value that resolves to nothing, rather than refusing to hold it', async () => {
    await renderWithProviders(<Harness initial="notYetDeployed" />)
    expect(screen.getByRole('img', { name: 'Warning' })).toBeInTheDocument()
  })

  it('does not warn on a value that resolves', async () => {
    await renderWithProviders(<Harness initial="approveOrder" />)
    expect(screen.queryByRole('img', { name: 'Warning' })).not.toBeInTheDocument()
  })

  it('filters the list as the user types', async () => {
    await renderWithProviders(<Harness />)
    await userEvent.click(screen.getByRole('button'))
    await userEvent.type(screen.getByPlaceholderText('Filter or type a value'), 'credit')

    expect(screen.queryByText('approveOrder')).not.toBeInTheDocument()
    expect(screen.getByText('creditCheck')).toBeInTheDocument()
  })
})
