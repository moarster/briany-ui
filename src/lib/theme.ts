import { useSyncExternalStore } from 'react'

export type ThemePreference = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

const THEME_KEY = 'briany.theme'
const GLASS_KEY = 'briany.glass'

const listeners = new Set<() => void>()

type ThemeState = {
  preference: ThemePreference
  resolved: ResolvedTheme
  glass: boolean
}

let state: ThemeState = { preference: 'dark', resolved: 'dark', glass: true }

function systemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function apply(next: ThemeState) {
  state = next
  const root = document.documentElement
  root.dataset.theme = next.resolved
  root.dataset.glass = next.glass ? 'on' : 'off'
  for (const listener of listeners) listener()
}

/**
 * Dark is the default. `prefers-color-scheme` is honoured on first load only, until the
 * user expresses a preference, which is then stored and wins.
 */
export function initTheme(glassAllowedByConfig: boolean) {
  let preference: ThemePreference = 'dark'
  let glass = glassAllowedByConfig
  try {
    const storedTheme = localStorage.getItem(THEME_KEY)
    if (storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system') {
      preference = storedTheme
    } else {
      preference = 'system'
    }
    const storedGlass = localStorage.getItem(GLASS_KEY)
    // config.json can switch glass off for a deployment; the user can only turn it off
    // further, never back on against the deployment's wish.
    if (storedGlass !== null) glass = glassAllowedByConfig && storedGlass === 'on'
  } catch {
    // Storage disabled: the defaults are still a complete, usable configuration.
  }

  apply({
    preference,
    resolved: preference === 'system' ? systemTheme() : preference,
    glass,
  })

  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (state.preference === 'system') apply({ ...state, resolved: systemTheme() })
  })
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_KEY, preference)
  } catch {
    /* not persisted, still applied */
  }
  apply({ ...state, preference, resolved: preference === 'system' ? systemTheme() : preference })
}

export function setGlass(glass: boolean) {
  try {
    localStorage.setItem(GLASS_KEY, glass ? 'on' : 'off')
  } catch {
    /* not persisted, still applied */
  }
  apply({ ...state, glass })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): ThemeState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}
