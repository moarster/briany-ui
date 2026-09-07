import { expect, test } from './fixtures'

/**
 * Flow 1: create an application, add a BPMN file, add a user task, bind a new form created
 * inline, save, deploy, see `Synced`.
 *
 * Endpoints: POST/GET /modeler-apps, POST/PUT /modeler-apps/{key}/files,
 * GET /modeler-apps/{key}/files/{fileKey}/content, POST /modeler-apps/{key}/deploy.
 */

const appKey = `e2e-${Date.now()}`

test.describe.configure({ mode: 'serial' })

test('creates an application from the grid', async ({ page }) => {
  await page.goto('/applications')

  await page.getByRole('button', { name: 'New application' }).first().click()
  await page.getByLabel('Key').fill(appKey)
  await page.getByLabel('Name').fill('End to end')
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  // Creating navigates straight into the new application.
  await expect(page).toHaveURL(new RegExp(`/applications/${appKey}$`))
  await expect(page.getByRole('heading', { name: 'End to end' })).toBeVisible()
  await expect(page.getByText('Draft')).toBeVisible()
})

test('adds a BPMN process and opens its editor', async ({ page }) => {
  await page.goto(`/applications/${appKey}`)

  await page.getByRole('button', { name: 'Add file' }).click()
  await page.getByRole('menuitem', { name: 'BPMN process' }).click()
  await page.getByLabel('Key').fill('e2eProcess')
  await page.getByLabel('Name').fill('End to end process')
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  await expect(page).toHaveURL(new RegExp(`/applications/${appKey}/files/e2eProcess`))
  // The canvas is the editor's primary surface; its presence is what "opened" means.
  await expect(page.locator('.bjs-container')).toBeVisible()
})

test('adds a user task, binds a form created inline, and saves', async ({ page }) => {
  await page.goto(`/applications/${appKey}/files/e2eProcess`)
  await expect(page.locator('.bjs-container')).toBeVisible()

  // The palette is trimmed to the engine whitelist, so a user task is present by name.
  await page.locator('.djs-palette [data-action="create.user-task"]').click()
  await page.locator('.djs-container').click({ position: { x: 320, y: 200 } })

  await page.locator('.djs-element[data-element-id^="Activity"]').first().click()

  await page.getByRole('button', { name: /Bind a form|Select or type/ }).click()
  await page.getByRole('button', { name: 'Create form in this application' }).click()
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
})

test('deploys the application and sees it turn Synced', async ({ page }) => {
  await page.goto(`/applications/${appKey}`)

  await page.getByRole('button', { name: /^Deploy/ }).click()

  // A deploy is never optimistic, so the pill flips only once the server confirms.
  await expect(page.getByText('Synced')).toBeVisible({ timeout: 30_000 })
})
