import { describe, expect, it } from 'vitest'
import { createApplicationSchema, fieldErrors, newFileSchema } from './validation'

describe('application key', () => {
  it.each(['orders', 'order-management', 'a', 'A_1'])('accepts %s', (key) => {
    expect(createApplicationSchema.safeParse({ key }).success).toBe(true)
  })

  it.each(['1orders', '-orders', 'order management', 'order.s', ''])('rejects %s', (key) => {
    expect(createApplicationSchema.safeParse({ key }).success).toBe(false)
  })
})

describe('file key', () => {
  it('accepts an XML NCName, which is what the id inside the file has to be', () => {
    for (const key of ['approveOrder', '_private', 'order.v2', 'a-b']) {
      expect(newFileSchema.safeParse({ key }).success).toBe(true)
    }
  })

  it('rejects anything an XML id cannot hold', () => {
    for (const key of ['1st', 'has space', 'a:b', '']) {
      expect(newFileSchema.safeParse({ key }).success).toBe(false)
    }
  })
})

describe('fieldErrors', () => {
  it('keys the first message per field, which is what the form renders', () => {
    const parsed = createApplicationSchema.safeParse({ key: '1bad' })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(fieldErrors(parsed.error)).toHaveProperty('key')
  })
})
