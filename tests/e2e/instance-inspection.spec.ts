import { expect, test } from './fixtures'

/**
 * Flow 2: start an instance from a definition, find it in the instance list, open it, and
 * confirm the path decoration matches the activity history.
 *
 * Endpoints: GET /processes, POST /processes/{key}/start, GET /process-instances,
 * GET /process-instances/{id}, /activities and /variables, GET /processes/{key}/xml.
 */

test('starts an instance and inspects it against its history', async ({ page }) => {
  await page.goto('/processes')

  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()
  await firstRow.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Start instance' }).click()

  // Starting navigates to the created instance.
  await expect(page).toHaveURL(/\/processes\/instances\/[^/]+$/)

  // The history tree is the keyboard-navigable equivalent of the diagram, so it is what
  // the assertion reads rather than the SVG.
  const tree = page.getByRole('tree', { name: 'Instance history' })
  await expect(tree).toBeVisible()
  const nodes = tree.getByRole('treeitem')
  await expect(nodes.first()).toBeVisible()

  // Every active history node has a matching decorated element on the diagram.
  const activeCount = await tree.getByText('Active', { exact: true }).count()
  await expect(page.locator('.djs-element.briany-active')).toHaveCount(activeCount)
  await expect(page.locator('.briany-token-badge')).toHaveCount(activeCount)

  // Selecting a node selects the matching element, and the selection lives in the URL.
  await nodes.first().getByRole('button').last().click()
  await expect(page).toHaveURL(/activity=/)
  await expect(page.locator('.djs-element.briany-selected')).toHaveCount(1)

  // A completed path is highlighted, which is what makes the diagram readable at a glance.
  await expect(page.locator('.djs-element.briany-completed').first()).toBeVisible()
})

test('finds the instance again through the shared filter link', async ({ page }) => {
  await page.goto('/processes/instances?state=running')

  // Every filter is a search param, so this URL is the whole shareable state.
  await expect(page).toHaveURL(/state=running/)
  await expect(page.locator('tbody tr').first()).toBeVisible()
  await expect(page.getByText('Running').first()).toBeVisible()

  await page.locator('tbody tr').first().click()
  await expect(page).toHaveURL(/\/processes\/instances\/[^/]+$/)
})
