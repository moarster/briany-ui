import { useQuery } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { CATALOGUE_STALE_TIME, getProcessVersionXmlOptions, getProcessXmlOptions } from '../../api'

/**
 * The deployed BPMN source of a definition. The endpoint is declared `format: binary`, so
 * the generated type is a Blob; the request asks for text, which is what bpmn-js consumes.
 */
export function useProcessXml(key: string, version?: number) {
  const options = (version === undefined
    ? getProcessXmlOptions({ path: { key }, parseAs: 'text' })
    : getProcessVersionXmlOptions({
        path: { key, version },
        parseAs: 'text',
      })) as unknown as UseQueryOptions<string, Error, string, readonly unknown[]>

  return useQuery({
    ...options,
    staleTime: CATALOGUE_STALE_TIME,
    enabled: key !== '',
  })
}
