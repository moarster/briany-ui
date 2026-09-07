import { create } from 'zustand'
import type { ModelerFileType } from '../../api'

export type OpenTab = {
  fileKey: string
  name: string
  type: ModelerFileType
}

type EditorState = {
  /** Open tabs per application key. Session state, mirrored to `sessionStorage`. */
  tabs: Record<string, OpenTab[]>
  /** Whether a file has unsaved changes. Owned by the host, not by an editor. */
  dirty: Record<string, boolean>
  openTab: (appKey: string, tab: OpenTab) => void
  closeTab: (appKey: string, fileKey: string) => void
  setDirty: (appKey: string, fileKey: string, dirty: boolean) => void
  isDirty: (appKey: string, fileKey: string) => boolean
  dirtyTabs: (appKey: string) => OpenTab[]
}

const STORAGE_PREFIX = 'briany.tabs.'

function readTabs(appKey: string): OpenTab[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + appKey)
    return raw ? (JSON.parse(raw) as OpenTab[]) : []
  } catch {
    return []
  }
}

function writeTabs(appKey: string, tabs: OpenTab[]) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + appKey, JSON.stringify(tabs))
  } catch {
    // Not persisted; the tab strip still works for this page view.
  }
}

const dirtyKey = (appKey: string, fileKey: string) => `${appKey}/${fileKey}`

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: {},
  dirty: {},

  openTab: (appKey, tab) =>
    set((state) => {
      const existing = state.tabs[appKey] ?? readTabs(appKey)
      if (existing.some((candidate) => candidate.fileKey === tab.fileKey)) {
        return { tabs: { ...state.tabs, [appKey]: existing } }
      }
      const next = [...existing, tab]
      writeTabs(appKey, next)
      return { tabs: { ...state.tabs, [appKey]: next } }
    }),

  closeTab: (appKey, fileKey) =>
    set((state) => {
      const next = (state.tabs[appKey] ?? readTabs(appKey)).filter(
        (candidate) => candidate.fileKey !== fileKey,
      )
      writeTabs(appKey, next)
      const dirty = { ...state.dirty }
      delete dirty[dirtyKey(appKey, fileKey)]
      return { tabs: { ...state.tabs, [appKey]: next }, dirty }
    }),

  setDirty: (appKey, fileKey, isDirty) =>
    set((state) => ({ dirty: { ...state.dirty, [dirtyKey(appKey, fileKey)]: isDirty } })),

  isDirty: (appKey, fileKey) => get().dirty[dirtyKey(appKey, fileKey)] === true,

  dirtyTabs: (appKey) => {
    const state = get()
    return (state.tabs[appKey] ?? readTabs(appKey)).filter(
      (tab) => state.dirty[dirtyKey(appKey, tab.fileKey)] === true,
    )
  },
}))

/** Hydrates the tab strip for an application from `sessionStorage`. */
export function tabsFor(appKey: string): OpenTab[] {
  const inMemory = useEditorStore.getState().tabs[appKey]
  return inMemory ?? readTabs(appKey)
}
