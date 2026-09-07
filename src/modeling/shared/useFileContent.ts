import { useQuery } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { getModelerAppFileContentOptions } from '../../api'

/**
 * The file's source as text. The content endpoint serves XML and JSON, so the response is
 * parsed as text and each editor interprets it - the client never guesses at a MIME type.
 */
export function useFileContent(appKey: string, fileKey: string) {
  // The endpoint is declared `format: binary`, so the generated type is Blob. The request
  // asks for text, which is what every editor here consumes, so the options are retyped
  // once here rather than at each call site.
  const options = getModelerAppFileContentOptions({
    path: { key: appKey, fileKey },
    parseAs: 'text',
  }) as unknown as UseQueryOptions<string, Error, string, readonly unknown[]>

  return useQuery({
    ...options,
    // The workspace source is the one thing the editor must never serve stale.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  })
}

/**
 * The host owns `isDirty` by comparing a hash of the serialised content against the last
 * saved value. Counting change events does not work: bpmn-js fires them for viewport
 * moves, which change nothing about the document.
 */
export function contentHash(content: string): string {
  // FNV-1a. Not cryptographic - it only has to detect that two strings differ.
  let hash = 0x811c9dc5
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}
