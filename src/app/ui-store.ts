import { create } from 'zustand'

const SIDEBAR_KEY = 'briany.sidebar'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed'
  } catch {
    return false
  }
}

type UiState = {
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  /** Set by the 503 handler so the shell can say the backend is down, not "error". */
  backendUnavailableUntil: number | null
  toggleSidebar: () => void
  setCommandPaletteOpen: (open: boolean) => void
  reportBackendUnavailable: (retryAfterSeconds: number | null) => void
  clearBackendUnavailable: () => void
}

/** UI state only. Nothing that the server owns ever lands in a Zustand store. */
export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: readCollapsed(),
  commandPaletteOpen: false,
  backendUnavailableUntil: null,
  toggleSidebar: () =>
    set((current) => {
      const next = !current.sidebarCollapsed
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? 'collapsed' : 'expanded')
      } catch {
        /* not persisted, still applied */
      }
      return { sidebarCollapsed: next }
    }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  reportBackendUnavailable: (retryAfterSeconds) =>
    set({ backendUnavailableUntil: Date.now() + (retryAfterSeconds ?? 30) * 1000 }),
  clearBackendUnavailable: () => set({ backendUnavailableUntil: null }),
}))
