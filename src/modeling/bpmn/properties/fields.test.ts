import { BpmnModdle } from 'bpmn-moddle'
import { beforeAll, describe, expect, it } from 'vitest'
import flowableModdle from '../moddle/flowable.json'
import brianyModdle from '../moddle/briany.json'
import {
  createField,
  fieldElements,
  hasAttributeFormFields,
  isAttributeForm,
  isHttpOwnedField,
  normaliseFields,
  readField,
} from './fields'
import type { ModdleElement } from './fields'

/**
 * The `flowable:field` read/write helpers, including the attribute-form import path that
 * moddle cannot model and the editor therefore has to detect rather than lose.
 */

const withFields = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:flowable="http://flowable.org/bpmn"
             targetNamespace="http://briany.ru/processdef" id="Definitions_t">
  <process id="t" isExecutable="true">
    <serviceTask id="Task_1" flowable:delegateExpression="\${kvDelegate}">
      <extensionElements>
        <flowable:field name="childString"><flowable:string>literal</flowable:string></flowable:field>
        <flowable:field name="childExpression"><flowable:expression>\${a}</flowable:expression></flowable:field>
        <flowable:field name="attributeString" flowable:stringValue="from-attribute" />
        <flowable:field name="attributeExpression" flowable:expression="\${b}" />
      </extensionElements>
    </serviceTask>
  </process>
</definitions>`

let moddle: any
let task: ModdleElement

beforeAll(async () => {
  moddle = new BpmnModdle({ flowable: flowableModdle, briany: brianyModdle })
  const { rootElement } = await moddle.fromXML(withFields)
  const process = rootElement.rootElements[0]
  task = process.flowElements[0]
})

describe('reading fields', () => {
  it('reads the child-element string form', () => {
    const field = fieldElements(task).find((candidate) => candidate.get('name') === 'childString')!
    expect(readField(field)).toEqual({ name: 'childString', value: 'literal', isExpression: false })
  })

  it('reads the child-element expression form', () => {
    const field = fieldElements(task).find(
      (candidate) => candidate.get('name') === 'childExpression',
    )!
    expect(readField(field)).toEqual({ name: 'childExpression', value: '${a}', isExpression: true })
  })

  it('reads the stringValue attribute form, so imported files round-trip', () => {
    const field = fieldElements(task).find(
      (candidate) => candidate.get('name') === 'attributeString',
    )!
    expect(readField(field)).toEqual({
      name: 'attributeString',
      value: 'from-attribute',
      isExpression: false,
    })
    expect(isAttributeForm(field)).toBe(true)
  })

  it('reads an imported expression attribute, which moddle folds into the same property', () => {
    const field = fieldElements(task).find(
      (candidate) => candidate.get('name') === 'attributeExpression',
    )!
    expect(readField(field)).toEqual({
      name: 'attributeExpression',
      value: '${b}',
      isExpression: true,
    })
    // Not an attribute form any more: moddle has already parsed it into the modelled
    // child-element property, so the panel edits it like any other field.
    expect(isAttributeForm(field)).toBe(false)
  })

  it('reports the stringValue attribute form, so the panel can offer a rewrite', () => {
    expect(hasAttributeFormFields(task)).toBe(true)
  })
})

describe('writing fields', () => {
  it('always writes the child-element form', () => {
    const literal = createField(moddle, { name: 'a', value: 'x', isExpression: false })
    expect(literal.get('string')).toBe('x')
    expect(literal.get('expression')).toBeUndefined()

    const expression = createField(moddle, { name: 'b', value: '${y}', isExpression: true })
    expect(expression.get('expression')).toBe('${y}')
    expect(expression.get('string')).toBeUndefined()
  })

  it('normalises attribute-form fields into the child-element form without losing values', () => {
    const normalised = normaliseFields(moddle, task)
    const byName = new Map(
      normalised.map((field) => [field.get('name') as string, readField(field)]),
    )

    expect(byName.get('attributeString')).toEqual({
      name: 'attributeString',
      value: 'from-attribute',
      isExpression: false,
    })
    expect(byName.get('attributeExpression')).toEqual({
      name: 'attributeExpression',
      value: '${b}',
      isExpression: true,
    })
    // normaliseFields returns replacements; it does not mutate the element in place, so
    // the task still reports the attribute form until the caller writes them back.
    expect(normalised.every((field) => !isAttributeForm(field))).toBe(true)
    expect(hasAttributeFormFields(task)).toBe(true)
  })
})

describe('HTTP field ownership', () => {
  it('claims the names the HTTP group edits, so a value has exactly one editor', () => {
    expect(isHttpOwnedField('requestUrl')).toBe(true)
    expect(isHttpOwnedField('requestMethod')).toBe(true)
    expect(isHttpOwnedField('namespace')).toBe(false)
  })
})
