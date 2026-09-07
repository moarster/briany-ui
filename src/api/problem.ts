import type { Problem, ValidationError } from './generated/types.gen'

export type { Problem, ValidationError }

/**
 * An RFC 7807 `application/problem+json` response, raised as an Error so it travels
 * through TanStack Query's error channel unchanged.
 *
 * Every error surface in this application renders `detail` and, when present, the
 * per-field list. Nothing renders a bare status code or a stack.
 */
export class ProblemError extends Error {
  readonly status: number
  readonly title?: string
  readonly detail: string
  readonly code?: string
  readonly type?: string
  readonly instance?: string
  readonly errors: ValidationError[]

  constructor(status: number, problem: Problem | undefined, fallbackDetail: string) {
    const detail = problem?.detail?.trim() || fallbackDetail
    super(detail)
    this.name = 'ProblemError'
    this.status = status
    this.title = problem?.title
    this.detail = detail
    this.code = problem?.code
    this.type = problem?.type
    this.instance = problem?.instance
    this.errors = problem?.errors ?? []
  }

  /** The payload behind the "Copy details" button on every error surface. */
  toReport(): string {
    return JSON.stringify(
      {
        status: this.status,
        title: this.title,
        detail: this.detail,
        code: this.code,
        type: this.type,
        instance: this.instance,
        errors: this.errors,
      },
      null,
      2,
    )
  }
}

export function isProblemError(error: unknown): error is ProblemError {
  return error instanceof ProblemError
}

/** True when the problem carries a specific application code, e.g. `TASK_HAS_NO_FORM`. */
export function hasCode(error: unknown, code: string): boolean {
  return isProblemError(error) && error.code === code
}

export function isNotFound(error: unknown): boolean {
  return isProblemError(error) && error.status === 404
}

/**
 * Groups `Problem.errors` by field, which is how the deploy failure panel maps engine
 * messages onto files. The backend convention is `field = "<fileKey>"` or
 * `"<fileKey>#<bpmnElementId>"`.
 */
export function groupErrorsByField(errors: ValidationError[]): Map<string, ValidationError[]> {
  const grouped = new Map<string, ValidationError[]>()
  for (const error of errors) {
    const existing = grouped.get(error.field)
    if (existing) existing.push(error)
    else grouped.set(error.field, [error])
  }
  return grouped
}

export type DeployErrorTarget = {
  fileKey: string
  elementId?: string
  message: string
}

/** Splits the `<fileKey>#<elementId>` convention into something a link can act on. */
export function parseDeployErrors(errors: ValidationError[]): DeployErrorTarget[] {
  return errors.map((error) => {
    const hash = error.field.indexOf('#')
    return hash === -1
      ? { fileKey: error.field, message: error.message }
      : {
          fileKey: error.field.slice(0, hash),
          elementId: error.field.slice(hash + 1),
          message: error.message,
        }
  })
}
