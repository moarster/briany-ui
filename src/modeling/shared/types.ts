import type { Severity } from '../../design/components'

/**
 * One row in the Problems drawer. Three sources merge into this shape: client-side lint,
 * the server's `ModelerAppFile.errors`, and the last deploy's `Problem.errors` for this
 * file. Whatever the origin, the row links to the offending element.
 */
export type EditorProblem = {
  id: string
  severity: Severity
  message: string
  /** The BPMN / DMN / form element the problem belongs to, when one is identifiable. */
  elementId?: string
  elementName?: string
  source: 'lint' | 'server' | 'deploy'
  /** The lint rule or the server error code. */
  code?: string
}

/**
 * The contract every editor implements towards the host. The host owns saving, dirty
 * tracking and the tab strip; an editor only serialises, reports problems, and reveals an
 * element when asked.
 */
export type EditorHandle = {
  /** Current content, serialised exactly as it would be saved. */
  serialise: () => Promise<string>
  /** Selects and scrolls to an element - used by the deploy failure panel's links. */
  reveal?: (elementId: string) => void
}
