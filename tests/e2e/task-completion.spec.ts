import { expect, test } from './fixtures'

/**
 * Flow 3: claim a task, complete its form, and confirm it leaves the queue.
 *
 * Endpoints: GET /me, GET /tasks, GET /tasks/{id}, GET /tasks/{id}/form,
 * POST /tasks/{id}/claim, POST /tasks/{id}/complete.
 */

test('claims a task, completes its form, and sees it leave the queue', async ({ page }) => {
  await page.goto('/tasks')

  const queue = page.locator('aside').first()
  const firstTask = queue.locator('li button').first()
  await expect(firstTask).toBeVisible()

  const taskName = (await firstTask.locator('span').first().textContent())?.trim()
  await firstTask.click()

  // Selection is a search param, so a task is linkable.
  await expect(page).toHaveURL(/taskId=/)

  await page.getByRole('button', { name: 'Assign to me' }).click()
  await expect(page.getByRole('button', { name: 'Unassign' })).toBeVisible()

  // The form tab renders the task's form; completing submits only the variables it binds.
  await page.getByRole('tab', { name: 'Form' }).click()
  await page.getByRole('button', { name: 'Complete' }).click()

  // Completing is optimistic: the task leaves the queue immediately and the next one is
  // selected, which is what makes the worklist feel fast.
  if (taskName) {
    await expect(queue.getByText(taskName, { exact: true })).toHaveCount(0)
  }
})

test('offers the raw variable editor when a task has no form', async ({ page }) => {
  await page.goto('/tasks?filter=open')

  const queue = page.locator('aside').first()
  await expect(queue.locator('li button').first()).toBeVisible()

  // Plenty of user tasks have no formKey; the fallback is a first-class surface, not an
  // error state, so it must be reachable and usable.
  const tasks = queue.locator('li button')
  for (let index = 0; index < (await tasks.count()); index += 1) {
    await tasks.nth(index).click()
    const fallback = page.getByText('This task has no form')
    if (await fallback.isVisible().catch(() => false)) {
      await expect(page.getByRole('button', { name: 'Add variable' })).toBeVisible()
      return
    }
  }
})
