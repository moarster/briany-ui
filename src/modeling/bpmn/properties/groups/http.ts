import { HTTP_FIELD_NAMES, createField, extensionValues, fieldElements, readField } from '../fields'
import type { ModdleElement } from '../fields'
import {
  customCheckboxEntry,
  customSelectEntry,
  customTextAreaEntry,
  customEntry,
} from '../entries'
import type { EntryContext, PanelEntry } from '../entries'

/**
 * A typed view over the same `flowable:field` list. Flowable's HTTP task is configured
 * entirely through fields, so this group must not invent a parallel storage; it reads and
 * writes exactly the fields the raw Fields group hides (see `isHttpOwnedField`), which
 * gives every value exactly one editor.
 */

type FieldKind = 'text' | 'textarea' | 'number' | 'boolean' | 'select'

type HttpField = {
  name: (typeof HTTP_FIELD_NAMES)[number]
  label: string
  kind: FieldKind
  description?: string
  options?: { value: string; label: string }[]
  monospace?: boolean
}

const HTTP_FIELDS: HttpField[] = [
  {
    name: 'requestMethod',
    label: 'Method',
    kind: 'select',
    options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((value) => ({ value, label: value })),
  },
  { name: 'requestUrl', label: 'URL', kind: 'text', monospace: true },
  {
    name: 'requestHeaders',
    label: 'Headers',
    kind: 'textarea',
    description: 'One header per line, as Name: value.',
    monospace: true,
  },
  { name: 'requestBody', label: 'Body', kind: 'textarea', monospace: true },
  { name: 'requestBodyEncoding', label: 'Body encoding', kind: 'text' },
  { name: 'requestTimeout', label: 'Timeout (ms)', kind: 'number' },
  { name: 'disallowRedirects', label: 'Do not follow redirects', kind: 'boolean' },
  {
    name: 'failStatusCodes',
    label: 'Fail status codes',
    kind: 'text',
    description: 'Comma-separated codes or ranges that fail the task, e.g. 400,5XX.',
  },
  {
    name: 'handleStatusCodes',
    label: 'Handle status codes',
    kind: 'text',
    description: 'Codes that raise a BPMN error instead of failing the job.',
  },
  { name: 'ignoreException', label: 'Ignore exceptions', kind: 'boolean' },
  { name: 'responseVariableName', label: 'Response variable', kind: 'text', monospace: true },
  { name: 'saveRequestVariables', label: 'Save request variables', kind: 'boolean' },
  { name: 'saveResponseParameters', label: 'Save response parameters', kind: 'boolean' },
  {
    name: 'saveResponseParametersTransient',
    label: 'Save response parameters as transient',
    kind: 'boolean',
  },
  { name: 'saveResponseVariableAsJson', label: 'Save response as JSON', kind: 'boolean' },
  { name: 'resultVariablePrefix', label: 'Result variable prefix', kind: 'text', monospace: true },
]

export function httpGroup(context: EntryContext): PanelEntry[] {
  return HTTP_FIELDS.map((field) => {
    const getValue = () => readHttpField(context.element.businessObject, field.name)
    const setValue = (value: string) => writeHttpField(context, field.name, value)

    switch (field.kind) {
      case 'boolean':
        return customCheckboxEntry(context, {
          id: `http-${field.name}`,
          label: field.label,
          description: field.description,
          getValue: () => getValue() === 'true',
          setValue: (value: boolean) => setValue(value ? 'true' : ''),
        })
      case 'select':
        return customSelectEntry(context, {
          id: `http-${field.name}`,
          label: field.label,
          description: field.description,
          options: field.options ?? [],
          getValue,
          setValue,
        })
      case 'textarea':
        return customTextAreaEntry(context, {
          id: `http-${field.name}`,
          label: field.label,
          description: field.description,
          monospace: field.monospace,
          getValue,
          setValue,
        })
      default:
        return customEntry(context, {
          id: `http-${field.name}`,
          label: field.label,
          description: field.description,
          monospace: field.monospace,
          getValue,
          setValue,
        })
    }
  })
}

function readHttpField(businessObject: ModdleElement, name: string): string {
  const field = fieldElements(businessObject).find((candidate) => candidate.get('name') === name)
  return field ? readField(field).value : ''
}

function writeHttpField(context: EntryContext, name: string, value: string) {
  const { element, modeling, moddle } = context
  const businessObject = element.businessObject as ModdleElement

  let extensionElements = businessObject.get('extensionElements')
  if (!extensionElements) {
    extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
    modeling.updateModdleProperties(element, businessObject, { extensionElements })
  }

  const values = extensionValues(businessObject)
  const existing = values.find(
    (candidate) => candidate.$type === 'flowable:Field' && candidate.get('name') === name,
  )

  if (value === '') {
    if (!existing) return
    modeling.updateModdleProperties(element, extensionElements, {
      values: values.filter((candidate) => candidate !== existing),
    })
    return
  }

  // An HTTP field value can be a literal or a JUEL expression; the child-element form is
  // written either way, which is what the moddle README documents.
  const asExpression = value.trim().startsWith('${')

  if (existing) {
    modeling.updateModdleProperties(element, existing, {
      string: asExpression ? undefined : value,
      expression: asExpression ? value : undefined,
      stringValue: undefined,
    })
    return
  }

  const field = createField(moddle, { name, value, isExpression: asExpression })
  modeling.updateModdleProperties(element, extensionElements, { values: [...values, field] })
}
