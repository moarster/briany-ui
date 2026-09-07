import { describe, expect, it } from 'vitest'
import { ProblemError, groupErrorsByField, hasCode, isNotFound, parseDeployErrors } from './problem'

describe('ProblemError', () => {
  it('renders the server detail, which is what every error surface shows', () => {
    const error = new ProblemError(400, { detail: 'The BPMN model is invalid.' }, 'fallback')
    expect(error.detail).toBe('The BPMN model is invalid.')
    expect(error.message).toBe('The BPMN model is invalid.')
  })

  it('falls back when the body carries no usable detail', () => {
    expect(new ProblemError(500, undefined, 'fallback').detail).toBe('fallback')
    expect(new ProblemError(500, { detail: '   ' }, 'fallback').detail).toBe('fallback')
  })

  it('carries the per-field list the deploy panel maps onto files', () => {
    const error = new ProblemError(
      400,
      { detail: 'Deploy failed.', errors: [{ field: 'orders', message: 'no start event' }] },
      'fallback',
    )
    expect(error.errors).toHaveLength(1)
  })

  it('produces a machine-readable report for a bug report', () => {
    const error = new ProblemError(
      409,
      { detail: 'Conflict', code: 'KEY_TAKEN', instance: '/x' },
      'f',
    )
    expect(JSON.parse(error.toReport())).toMatchObject({
      status: 409,
      code: 'KEY_TAKEN',
      instance: '/x',
    })
  })
})

describe('code helpers', () => {
  it('recognises the documented no-form code, which is not a failure', () => {
    const error = new ProblemError(404, { detail: 'No form.', code: 'TASK_HAS_NO_FORM' }, 'f')
    expect(hasCode(error, 'TASK_HAS_NO_FORM')).toBe(true)
    expect(hasCode(error, 'SOMETHING_ELSE')).toBe(false)
    expect(isNotFound(error)).toBe(true)
  })

  it('is safe against a non-problem value', () => {
    expect(hasCode(new Error('boom'), 'X')).toBe(false)
    expect(isNotFound(undefined)).toBe(false)
  })
})

describe('deploy error parsing', () => {
  it('splits the <fileKey>#<elementId> convention so a link can act on it', () => {
    expect(
      parseDeployErrors([
        { field: 'orders', message: 'file level' },
        { field: 'orders#Task_1', message: 'element level' },
      ]),
    ).toEqual([
      { fileKey: 'orders', message: 'file level' },
      { fileKey: 'orders', elementId: 'Task_1', message: 'element level' },
    ])
  })

  it('groups by field, preserving order within a field', () => {
    const grouped = groupErrorsByField([
      { field: 'a', message: 'one' },
      { field: 'b', message: 'two' },
      { field: 'a', message: 'three' },
    ])
    expect(grouped.get('a')?.map((entry) => entry.message)).toEqual(['one', 'three'])
    expect(grouped.get('b')).toHaveLength(1)
  })
})
