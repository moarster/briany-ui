import { ListGroup } from '@bpmn-io/properties-panel'
import { createField, extensionValues, fieldElements, isHttpOwnedField, readField } from '../fields'
import type { ModdleElement } from '../fields'
import { customEntry, customSelectEntry } from '../entries'
import type { EntryContext } from '../entries'

/**
 * The raw `flowable:field` list editor. Fields the HTTP group owns are hidden here, so a
 * value has exactly one editor rather than two that can disagree.
 */
export function fieldsGroup(context: EntryContext) {
  const { element, modeling, moddle, translate } = context
  const businessObject = element.businessObject as ModdleElement

  const visible = fieldElements(businessObject).filter(
    (field) => !isHttpOwnedField((field.get('name') as string | undefined) ?? ''),
  )

  return {
    id: 'flowable-fields',
    label: translate('Fields'),
    component: ListGroup,
    items: visible.map((field, index) => fieldItem(context, field, index)),
    add: () => {
      const values = extensionValues(businessObject)
      let extensionElements = businessObject.get('extensionElements')
      if (!extensionElements) {
        extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
        modeling.updateModdleProperties(element, businessObject, { extensionElements })
      }
      const field = createField(moddle, { name: '', value: '', isExpression: false })
      modeling.updateModdleProperties(element, extensionElements, { values: [...values, field] })
    },
  }
}

function fieldItem(context: EntryContext, field: ModdleElement, index: number) {
  const { element, modeling } = context
  const businessObject = element.businessObject as ModdleElement
  const current = readField(field)

  const write = (patch: { name?: string; value?: string; isExpression?: boolean }) => {
    const next = { ...current, ...patch }
    modeling.updateModdleProperties(element, field, {
      name: next.name,
      string: next.isExpression ? undefined : next.value,
      expression: next.isExpression ? next.value : undefined,
      // Writing always normalises to the child-element form.
      stringValue: undefined,
    })
  }

  return {
    id: `field-${index}`,
    label: current.name || `Field ${index + 1}`,
    remove: () => {
      const extensionElements = businessObject.get('extensionElements')
      const values = extensionValues(businessObject)
      modeling.updateModdleProperties(element, extensionElements, {
        values: values.filter((candidate) => candidate !== field),
      })
    },
    entries: [
      customEntry(context, {
        id: `field-${index}-name`,
        label: 'Name',
        monospace: true,
        getValue: () => current.name,
        setValue: (value: string) => write({ name: value }),
      }),
      customSelectEntry(context, {
        id: `field-${index}-kind`,
        label: 'Value kind',
        allowEmpty: false,
        options: [
          { value: 'string', label: 'String' },
          { value: 'expression', label: 'Expression' },
        ],
        getValue: () => (current.isExpression ? 'expression' : 'string'),
        setValue: (value: string) => write({ isExpression: value === 'expression' }),
      }),
      customEntry(context, {
        id: `field-${index}-value`,
        label: 'Value',
        monospace: current.isExpression,
        getValue: () => current.value,
        setValue: (value: string) => write({ value }),
      }),
    ],
  }
}
