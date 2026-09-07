import { create } from 'zustand'

const STORAGE_KEY = 'briany.auth'

export type Credential = {
  username: string
  /** `Basic <base64>`, ready to be used as an Authorization header value. */
  header: string
}

export function encodeBasic(username: string, password: string): string {
  // btoa() is byte-oriented; encode to UTF-8 first so non-ASCII passwords survive.
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `Basic ${btoa(binary)}`
}

function read(): Credential | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Credential).header === 'string' &&
      typeof (parsed as Credential).username === 'string'
    ) {
      return parsed as Credential
    }
    return null
  } catch {
    return null
  }
}

type AuthState = {
  credential: Credential | null
  signIn: (credential: Credential) => void
  signOut: () => void
}

/**
 * Credentials live in `sessionStorage` only, under one key, so closing the tab drops
 * them. Never `localStorage`, and never a cookie this application sets itself.
 */
export const useAuthStore = create<AuthState>((set) => ({
  credential: read(),
  signIn: (credential) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credential))
    set({ credential })
  },
  signOut: () => {
    sessionStorage.removeItem(STORAGE_KEY)
    set({ credential: null })
  },
}))

/** Read outside React, for the request interceptor. */
export function currentCredential(): Credential | null {
  return useAuthStore.getState().credential
}

export function isAuthenticated(): boolean {
  return useAuthStore.getState().credential !== null
}
