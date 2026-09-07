import { test as base } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Signs in before each flow. The credential lives in `sessionStorage` under one key, so it
 * is seeded there rather than driven through the login form in every test - the login form
 * itself is covered by the first flow.
 */
export async function signIn(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'briany.auth',
      JSON.stringify({ username: 'demo', header: `Basic ${btoa('demo:demo')}` }),
    )
  })
}

export const test = base.extend({
  // Playwright names this callback `use`; renamed here so it does not read as a React hook.
  page: async ({ page }, runTest) => {
    await signIn(page)
    await runTest(page)
  },
})

export { expect } from '@playwright/test'
