import { useQuery } from '@tanstack/react-query'
import {
  CATALOGUE_STALE_TIME,
  getBpmnPaletteOptions,
  getEngineCapabilitiesOptions,
} from '../../../api'
import type {
  BpmnElementDescriptorRoot as BpmnElementDescriptor,
  EngineCapabilities,
} from '../../../api'

/**
 * Engine constraints arrive from the API, never from a constant in a component. The one
 * exception is the script and shell exclusion in `../constants.ts`, which is a product
 * invariant rather than a deployment setting.
 */

export const FALLBACK_CAPABILITIES: EngineCapabilities = {
  allowedActivityTypes: [],
  allowedDelegateBeans: [],
  allowedClassPrefixes: [],
  activityWhitelistEnabled: false,
}

export function useEngineCapabilities() {
  const query = useQuery({
    ...getEngineCapabilitiesOptions(),
    staleTime: Number.POSITIVE_INFINITY,
  })
  return {
    capabilities: sanitise(query.data ?? FALLBACK_CAPABILITIES),
    isLoading: query.isLoading,
  }
}

export function useBpmnPalette(): { descriptors: BpmnElementDescriptor[]; isLoading: boolean } {
  const query = useQuery({ ...getBpmnPaletteOptions(), staleTime: CATALOGUE_STALE_TIME })
  // An empty elements array is valid: the palette then shows only the built-in groups.
  return { descriptors: query.data?.elements ?? [], isLoading: query.isLoading }
}

/**
 * A server that reports `script_task` as an allowed activity type is misconfigured, since
 * the product excludes it unconditionally. Log it and drop it rather than surfacing a
 * script task in the palette.
 */
function sanitise(capabilities: EngineCapabilities): EngineCapabilities {
  if (!capabilities.allowedActivityTypes.includes('script_task')) return capabilities
  console.warn(
    'The engine reports script_task as an allowed activity type. Briany excludes script ' +
      'tasks at the product level, so the value is ignored. Fix the engine configuration.',
  )
  return {
    ...capabilities,
    allowedActivityTypes: capabilities.allowedActivityTypes.filter(
      (type) => type !== 'script_task',
    ),
  }
}

/**
 * Maps a BPMN element type to the snake_case activity name the engine whitelist uses,
 * e.g. `bpmn:UserTask` -> `user_task`.
 */
export function toActivityType(bpmnType: string): string {
  return bpmnType
    .replace(/^bpmn:/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
}

export function isActivityAllowed(capabilities: EngineCapabilities, bpmnType: string): boolean {
  if (!capabilities.activityWhitelistEnabled) return true
  if (capabilities.allowedActivityTypes.length === 0) return true
  return capabilities.allowedActivityTypes.includes(toActivityType(bpmnType))
}
