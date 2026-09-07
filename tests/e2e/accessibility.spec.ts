import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

/**
 * WCAG 2.2 AA on the four main routes, in both themes. Glass surfaces are checked against
 * the page they actually sit on rather than against a flat colour, which is why these run
 * in the real app instead of on isolated components.
 */
const routes = [
  { name: 'Applications', path: '/applications' },
  { name: 'Processes', path: '/processes' },
  { name: 'Instances', path: '/processes/instances' },
  { name: 'Tasks', path: '/tasks' },
]

for (const theme of ['dark', 'light'] as const) {
  for (const route of routes) {
    test(`${route.name} has no accessibility violations in ${theme}`, async ({ page }) => {
      await page.addInitScript((value) => {
        localStorage.setItem('briany.theme', value)
      }, theme)

      await page.goto(route.path)
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        // The three modeling canvases bring their own DOM and are not accessible on their
        // own; the instance history tree is their keyboard-navigable equivalent and is
        // covered by the flows instead.
        .exclude('.bjs-container')
        .exclude('.dmn-js-parent')
        .exclude('.fjs-container')
        .analyze()

      expect(results.violations).toEqual([])
    })
  }
}
