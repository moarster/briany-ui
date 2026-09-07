import type { BpmnElementDescriptorRoot as BpmnElementDescriptor } from '../../../../api'
import type { EntryContext } from '../entries'
import { createField, extensionValues, fieldElements, readField } from '../fields'
import type { ModdleElement } from '../fields'
import type { DescriptorState, PropertyValue, WriteOperation } from './compiler'

/**
 * The only place the pure descriptor compiler meets moddle. The compiler emits write
 * operations; this module executes them, and reads the current state back out.
 */

export function readDescriptorState(
  businessObject: ModdleElement,
  descriptor: BpmnElementDescriptor,
): DescriptorState {
  const state: DescriptorState = {}

  for (const property of descriptor.properties) {
    const key = property.key
    if (key === undefined) continue
    const binding = property.binding
    if (binding === undefined) continue

    if (binding.tag && binding.attribute) {
      state[key] = readChildTagAttribute(businessObject, binding.tag, binding.attribute)
    } else if (binding.attribute) {
      state[key] = coerce(businessObject.get(binding.attribute))
    } else if (binding.tag) {
      state[key] = readChildTagText(businessObject, binding.tag)
    } else {
      const field = fieldElements(businessObject).find((candidate) => candidate.get('name') === key)
      state[key] = field ? readField(field).value : undefined
    }
  }

  return state
}

export function writeDescriptorValue(
  context: EntryContext,
  write: WriteOperation,
  options: { onlyIfChanged?: boolean } = {},
): void {
  const { element, modeling, moddle } = context
  const businessObject = element.businessObject as ModdleElement

  switch (write.kind) {
    case 'attribute': {
      if (options.onlyIfChanged && businessObject.get(write.attribute) === write.value) return
      modeling.updateModdleProperties(element, businessObject, {
        [write.attribute]: write.value,
      })
      return
    }

    case 'field': {
      const existing = fieldElements(businessObject).find(
        (candidate) => candidate.get('name') === write.name,
      )

      if (write.value === undefined) {
        if (!existing) return
        const extensionElements = businessObject.get('extensionElements')
        modeling.updateModdleProperties(element, extensionElements, {
          values: extensionValues(businessObject).filter((candidate) => candidate !== existing),
        })
        return
      }

      if (existing) {
        const current = readField(existing)
        if (
          options.onlyIfChanged &&
          current.value === write.value &&
          current.isExpression === write.asExpression
        ) {
          return
        }
        modeling.updateModdleProperties(element, existing, {
          string: write.asExpression ? undefined : write.value,
          expression: write.asExpression ? write.value : undefined,
          stringValue: undefined,
        })
        return
      }

      const extensionElements = ensureExtensionElements(context)
      const field = createField(moddle, {
        name: write.name,
        value: write.value,
        isExpression: write.asExpression,
      })
      modeling.updateModdleProperties(element, extensionElements, {
        values: [...extensionValues(businessObject), field],
      })
      return
    }

    case 'childTagAttribute': {
      const child = findOrCreateChild(context, write.tag, write.value !== undefined)
      if (!child) return
      if (options.onlyIfChanged && child.get(write.attribute) === write.value) return
      modeling.updateModdleProperties(element, child, { [write.attribute]: write.value })
      return
    }

    case 'childTagText': {
      const child = findOrCreateChild(context, write.tag, write.value !== undefined)
      if (!child) return
      if (options.onlyIfChanged && child.get('body') === write.value) return
      modeling.updateModdleProperties(element, child, { body: write.value })
    }
  }
}

function ensureExtensionElements(context: EntryContext): ModdleElement {
  const { element, modeling, moddle } = context
  const businessObject = element.businessObject as ModdleElement
  const existing = businessObject.get('extensionElements')
  if (existing) return existing
  const created = moddle.create('bpmn:ExtensionElements', { values: [] })
  modeling.updateModdleProperties(element, businessObject, { extensionElements: created })
  return created
}

function findOrCreateChild(
  context: EntryContext,
  tag: string,
  create: boolean,
): ModdleElement | null {
  const { element, modeling, moddle } = context
  const businessObject = element.businessObject as ModdleElement
  const values = extensionValues(businessObject)
  const existing = values.find((value) => value.$type === tag)

  if (existing) return existing
  if (!create) return null

  const extensionElements = ensureExtensionElements(context)
  const child = moddle.create(tag, {})
  modeling.updateModdleProperties(element, extensionElements, {
    values: [...extensionValues(businessObject), child],
  })
  return child
}

function readChildTagAttribute(
  businessObject: ModdleElement,
  tag: string,
  attribute: string,
): PropertyValue {
  const child = extensionValues(businessObject).find((value) => value.$type === tag)
  return child ? coerce(child.get(attribute)) : undefined
}

function readChildTagText(businessObject: ModdleElement, tag: string): PropertyValue {
  const child = extensionValues(businessObject).find((value) => value.$type === tag)
  return child ? coerce(child.get('body')) : undefined
}

function coerce(value: unknown): PropertyValue {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return String(value)
}
