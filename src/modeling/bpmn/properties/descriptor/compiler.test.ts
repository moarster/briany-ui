import { describe, expect, it } from 'vitest'
import type { BpmnElementDescriptorRoot as BpmnElementDescriptor } from '../../../../api'
import { activeProperties, compileDescriptor, validate, writeFor } from './compiler'

/**
 * The compiler is the piece most likely to grow, so every binding and condition case in
 * BpmnElementDescriptor.yaml is pinned here.
 */

function descriptor(properties: BpmnElementDescriptor['properties']): BpmnElementDescriptor {
  return { id: 'test', version: 1, name: 'Test', bpmnActivity: 'serviceTask', properties }
}

describe('binding rules', () => {
  it('writes nothing when binding is absent, because the field is UI-only', () => {
    const property = { key: 'mode', label: 'Mode', type: 'String' as const }
    expect(writeFor(property, 'a')).toBeNull()
  })

  it('defaults to a flowable:field named after the key', () => {
    const property = { key: 'namespace', label: 'Namespace', type: 'String' as const, binding: {} }
    expect(writeFor(property, 'orders')).toEqual({
      kind: 'field',
      name: 'namespace',
      value: 'orders',
      asExpression: false,
    })
  })

  it('writes an expression field when juel is required', () => {
    const property = {
      key: 'entryKey',
      label: 'Key',
      type: 'String' as const,
      juel: 'required' as const,
      binding: {},
    }
    expect(writeFor(property, '${orderId}')).toEqual({
      kind: 'field',
      name: 'entryKey',
      value: '${orderId}',
      asExpression: true,
    })
  })

  it('writes an expression field for juel optional only when the value looks like one', () => {
    const property = {
      key: 'entryKey',
      label: 'Key',
      type: 'String' as const,
      juel: 'optional' as const,
      binding: {},
    }
    expect(writeFor(property, 'literal')).toMatchObject({ asExpression: false })
    expect(writeFor(property, '${orderId}')).toMatchObject({ asExpression: true })
  })

  it('writes an attribute on the element root when binding names one', () => {
    const property = {
      key: 'delegate',
      label: 'Delegate',
      type: 'Hidden' as const,
      binding: { attribute: 'flowable:delegateExpression' },
    }
    expect(writeFor(property, '${kvDelegate}')).toEqual({
      kind: 'attribute',
      attribute: 'flowable:delegateExpression',
      value: '${kvDelegate}',
    })
  })

  it('writes an attribute on a child tag when binding names both', () => {
    const property = {
      key: 'header',
      label: 'Header',
      type: 'String' as const,
      binding: { tag: 'flowable:in', attribute: 'source' },
    }
    expect(writeFor(property, 'amount')).toEqual({
      kind: 'childTagAttribute',
      tag: 'flowable:in',
      attribute: 'source',
      value: 'amount',
    })
  })

  it('writes the text content of a child tag when binding names only a tag', () => {
    const property = {
      key: 'retry',
      label: 'Retry',
      type: 'String' as const,
      binding: { tag: 'flowable:failedJobRetryTimeCycle' },
    }
    expect(writeFor(property, 'R3/PT10M')).toEqual({
      kind: 'childTagText',
      tag: 'flowable:failedJobRetryTimeCycle',
      value: 'R3/PT10M',
    })
  })

  it('emits an undefined value for an empty field, which removes the XML', () => {
    const property = { key: 'namespace', label: 'Namespace', type: 'String' as const, binding: {} }
    expect(writeFor(property, '')).toMatchObject({ value: undefined })
    expect(writeFor(property, undefined)).toMatchObject({ value: undefined })
  })
})

describe('conditions', () => {
  const properties = [
    { key: 'operation', label: 'Operation', type: 'Dropdown' as const, binding: {} },
    {
      key: 'payload',
      label: 'Value',
      type: 'Text' as const,
      binding: {},
      condition: { property: 'operation', equals: 'put' },
    },
    {
      key: 'resultVariable',
      label: 'Result',
      type: 'String' as const,
      binding: {},
      condition: { property: 'operation', oneOf: ['get', 'scan'] },
    },
  ]

  it('hides a field whose equals condition does not hold', () => {
    expect(activeProperties(properties, { operation: 'get' })).toEqual(
      new Set(['operation', 'resultVariable']),
    )
  })

  it('shows a field whose oneOf condition holds', () => {
    expect(activeProperties(properties, { operation: 'scan' }).has('resultVariable')).toBe(true)
  })

  it('supports allMatch as a composite condition', () => {
    const composite = [
      { key: 'a', label: 'A', type: 'String' as const, binding: {} },
      { key: 'b', label: 'B', type: 'String' as const, binding: {} },
      {
        key: 'c',
        label: 'C',
        type: 'String' as const,
        binding: {},
        condition: {
          allMatch: [
            { property: 'a', equals: '1' },
            { property: 'b', equals: '2' },
          ],
        },
      },
    ]
    expect(activeProperties(composite, { a: '1', b: '2' }).has('c')).toBe(true)
    expect(activeProperties(composite, { a: '1', b: '3' }).has('c')).toBe(false)
  })

  it('supports isActive, so one condition can depend on another field being visible', () => {
    const chained = [
      { key: 'a', label: 'A', type: 'String' as const, binding: {} },
      {
        key: 'b',
        label: 'B',
        type: 'String' as const,
        binding: {},
        condition: { property: 'a', equals: 'show' },
      },
      {
        key: 'c',
        label: 'C',
        type: 'String' as const,
        binding: {},
        condition: { property: 'b', isActive: true },
      },
    ]
    expect(activeProperties(chained, { a: 'show' }).has('c')).toBe(true)
    expect(activeProperties(chained, { a: 'hide' }).has('c')).toBe(false)
  })

  it('removes the XML of a field a condition has hidden', () => {
    const { entries, writes } = compileDescriptor(descriptor(properties), {
      operation: 'get',
      payload: 'stale',
    })
    expect(entries.map((entry) => entry.key)).toEqual(['operation', 'resultVariable'])
    expect(writes).toContainEqual({
      kind: 'field',
      name: 'payload',
      value: undefined,
      asExpression: false,
    })
  })
})

describe('entries', () => {
  it('does not render a Hidden field but still writes its default value', () => {
    const { entries, writes } = compileDescriptor(
      descriptor([
        {
          key: 'delegate',
          label: 'Delegate',
          type: 'Hidden',
          defaultValue: '${kvDelegate}',
          binding: { attribute: 'flowable:delegateExpression' },
        },
      ]),
      {},
    )
    expect(entries).toHaveLength(0)
    expect(writes).toEqual([
      { kind: 'attribute', attribute: 'flowable:delegateExpression', value: '${kvDelegate}' },
    ])
  })

  it('maps each descriptor type to its panel component kind', () => {
    const { entries } = compileDescriptor(
      descriptor([
        { key: 'a', label: 'A', type: 'String', binding: {} },
        { key: 'b', label: 'B', type: 'Number', binding: {} },
        { key: 'c', label: 'C', type: 'Text', binding: {} },
        { key: 'd', label: 'D', type: 'Boolean', binding: {} },
        { key: 'e', label: 'E', type: 'Dropdown', binding: {} },
      ]),
      {},
    )
    expect(entries.map((entry) => entry.kind)).toEqual([
      'string',
      'number',
      'text',
      'boolean',
      'dropdown',
    ])
  })

  it('renders a non-editable field read-only rather than hiding it', () => {
    const { entries } = compileDescriptor(
      descriptor([{ key: 'a', label: 'A', type: 'String', editable: false, binding: {} }]),
      { a: 'fixed' },
    )
    expect(entries[0]).toMatchObject({ editable: false, value: 'fixed' })
  })

  it('falls back to the default value when the element has none', () => {
    const { entries } = compileDescriptor(
      descriptor([{ key: 'a', label: 'A', type: 'String', defaultValue: 'fallback', binding: {} }]),
      {},
    )
    expect(entries[0]?.value).toBe('fallback')
  })
})

describe('validation', () => {
  it('reports a required field that is empty', () => {
    expect(validate({ key: 'a', label: 'A', type: 'String', required: true }, '')).toMatch(
      /required/,
    )
  })

  it('does not report a required field that a condition has hidden', () => {
    // A hidden field never reaches validate(), which compileDescriptor guarantees.
    const { entries } = compileDescriptor(
      descriptor([
        { key: 'mode', label: 'Mode', type: 'String', binding: {} },
        {
          key: 'a',
          label: 'A',
          type: 'String',
          required: true,
          binding: {},
          condition: { property: 'mode', equals: 'on' },
        },
      ]),
      { mode: 'off' },
    )
    expect(entries.some((entry) => entry.key === 'a')).toBe(false)
  })

  it('requires a leading ${ when juel is required', () => {
    const property = { key: 'a', label: 'A', type: 'String' as const, juel: 'required' as const }
    expect(validate(property, 'literal')).toMatch(/JUEL expression/)
    expect(validate(property, '${x}')).toBeUndefined()
  })

  it('applies the pattern and its message', () => {
    const property = {
      key: 'a',
      label: 'A',
      type: 'String' as const,
      pattern: { value: '^P(?=\\d|T\\d).*$', message: 'Enter the duration in ISO 8601 format' },
    }
    expect(validate(property, 'nope')).toBe('Enter the duration in ISO 8601 format')
    expect(validate(property, 'PT10M')).toBeUndefined()
  })
})
