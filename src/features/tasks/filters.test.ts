import { describe, expect, it } from 'vitest'
import { TASK_FILTERS, resolveFilter, tasksSearchSchema } from './filters'

describe('task filters', () => {
  it('maps each rail entry to a state plus an assignment, as the API expects', () => {
    expect(resolveFilter('open')).toMatchObject({ state: 'active', assignment: 'any' })
    expect(resolveFilter('mine')).toMatchObject({ state: 'active', assignment: 'mine' })
    expect(resolveFilter('unassigned')).toMatchObject({ state: 'active', assignment: 'unassigned' })
    expect(resolveFilter('claimable')).toMatchObject({ state: 'active', assignment: 'candidate' })
    expect(resolveFilter('completed')).toMatchObject({ state: 'completed', assignment: 'mine' })
  })

  it('offers exactly the five filters, and no follow-up date sort', () => {
    expect(TASK_FILTERS).toHaveLength(5)
  })
})

describe('search params', () => {
  it('defaults to the open queue sorted newest first', () => {
    expect(tasksSearchSchema.parse({})).toEqual({ filter: 'open', sort: 'createdAt,desc' })
  })

  it('round-trips a shared link, so a filtered view survives a reload', () => {
    const parsed = tasksSearchSchema.parse({ filter: 'mine', sort: 'dueAt,asc', taskId: '7741' })
    expect(parsed).toMatchObject({ filter: 'mine', sort: 'dueAt,asc', taskId: '7741' })
  })

  it('rejects an unknown filter rather than silently showing the wrong queue', () => {
    expect(tasksSearchSchema.safeParse({ filter: 'nonsense' }).success).toBe(false)
  })
})
