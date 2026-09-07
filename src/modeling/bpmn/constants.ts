/**
 * Product invariants for the BPMN editor.
 *
 * Everything else the editor constrains comes from `GET /api/v1/engine-capabilities`, so
 * no allowlist is hardcoded in a component. This file is the single, deliberate exception:
 * the script and shell exclusion is a **product rule**, not a deployment setting.
 *
 * See PROMPT.md section 1.5. Briany never executes arbitrary code supplied through a
 * process model. There is no configuration value that turns these back on, and
 * `EngineCapabilities` deliberately carries no flag for them - a flag would imply a
 * configuration that must never exist.
 *
 * Do not widen this file to "one more thing we hardcoded".
 */

/** BPMN element types the editor never offers, whatever the engine reports. */
export const EXCLUDED_ELEMENT_TYPES = ['bpmn:ScriptTask'] as const

/**
 * The only value the panel ever writes to `flowable:type`. `shell` and every other engine
 * type are unreachable from the UI.
 */
export const ALLOWED_SERVICE_TASK_TYPES = ['http'] as const

/** An engine type on an imported model that the product refuses to support. */
export const FORBIDDEN_SERVICE_TASK_TYPES = ['shell'] as const

export const EXCLUSION_RATIONALE =
  'Briany does not execute code supplied through a process model. Use a delegate from the ' +
  'allowlist, the HTTP task, or a custom element descriptor instead.'

/**
 * True for an element the product refuses to support. Such an element still opens, renders
 * and round-trips - import is permissive - but it is flagged by lint, the panel offers
 * only General and Documentation, and the engine refuses to deploy it.
 */
export function isExcludedElement(element: { $type?: string; type?: string }): boolean {
  const type = element.$type ?? element.type
  if (type === undefined) return false
  return (EXCLUDED_ELEMENT_TYPES as readonly string[]).includes(type)
}

export function isForbiddenServiceTaskType(value: string | undefined): boolean {
  return value !== undefined && (FORBIDDEN_SERVICE_TASK_TYPES as readonly string[]).includes(value)
}

/**
 * Names an excluded element for a user-facing notice, or `null` when the element is fine.
 *
 * This lives here rather than in the editor so that no component has to spell out an
 * excluded type: the CI guard in scripts/check-no-script-tasks.sh treats a mention
 * anywhere else as an authoring surface, and this file is the one place allowed to name
 * them.
 */
export function describeExcluded(element: {
  $type?: string
  get?: (name: string) => unknown
}): string | null {
  if (isExcludedElement(element)) return 'script task'
  const engineType = element.get?.('flowable:type')
  if (isForbiddenServiceTaskType(typeof engineType === 'string' ? engineType : undefined)) {
    return `${String(engineType)} task`
  }
  return null
}
