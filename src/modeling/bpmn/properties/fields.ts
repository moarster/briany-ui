/**
 * Read and write helpers for `flowable:field`.
 *
 * Flowable's XSD allows a field value either as an attribute (`stringValue`, `expression`)
 * or as a child element (`<flowable:string>`, `<flowable:expression>`). moddle cannot model
 * an attribute and a child element sharing the name `expression` on one type, so our
 * descriptor models `expression` as a child element only.
 *
 * Measured consequences of that choice (see the round-trip suite, which pins them):
 *
 * - The editor **always writes the child element form**, which sidesteps escaping problems
 *   in JSON request bodies, URLs and expressions.
 * - An imported `expression` **attribute** is parsed into the same modelled property, so
 *   it reads and edits normally - but it re-serialises as a child element. The value
 *   survives; the attribute spelling does not.
 * - `stringValue` is modelled as an attribute and round-trips as one, which is why it is
 *   the remaining attribute form `isAttributeForm` reports and "Normalise fields" rewrites.
 *
 * See moddle/README.md.
 */

export type ModdleElement = {
  $type: string
  $attrs?: Record<string, unknown>
  get: (name: string) => any
  set: (name: string, value: unknown) => void
}

export type FieldValue = {
  name: string
  value: string
  /** True when the value is a JUEL expression rather than a literal string. */
  isExpression: boolean
}

export type Moddle = {
  create: (type: string, attrs?: Record<string, unknown>) => ModdleElement
}

export function extensionValues(element: ModdleElement): ModdleElement[] {
  const extensionElements = element.get('extensionElements')
  return (extensionElements?.get('values') as ModdleElement[] | undefined) ?? []
}

export function fieldElements(element: ModdleElement): ModdleElement[] {
  return extensionValues(element).filter((value) => value.$type === 'flowable:Field')
}

export function readFields(element: ModdleElement): FieldValue[] {
  return fieldElements(element).map(readField)
}

export function readField(field: ModdleElement): FieldValue {
  const name = (field.get('name') as string | undefined) ?? ''

  // The child-element form this editor writes. An imported `flowable:expression`
  // attribute is parsed into the same property, so it is read here too.
  const expressionChild = field.get('expression') as string | undefined
  if (typeof expressionChild === 'string')
    return { name, value: expressionChild, isExpression: true }

  const stringChild = field.get('string') as string | undefined
  if (typeof stringChild === 'string') return { name, value: stringChild, isExpression: false }

  // Attribute form, from an imported file.
  const stringValue = field.get('stringValue') as string | undefined
  if (typeof stringValue === 'string') return { name, value: stringValue, isExpression: false }

  return { name, value: '', isExpression: false }
}

/**
 * True when a field still carries its value as the `stringValue` attribute. Such a field
 * reads correctly and round-trips as an attribute, but it does not match the child-element
 * form the editor writes, so a value would silently move the first time it is edited.
 */
export function isAttributeForm(field: ModdleElement): boolean {
  if (typeof field.get('expression') === 'string') return false
  if (typeof field.get('string') === 'string') return false
  return typeof field.get('stringValue') === 'string'
}

/** Whether an element has any attribute-form field, which the panel offers to rewrite. */
export function hasAttributeFormFields(element: ModdleElement): boolean {
  return fieldElements(element).some(isAttributeForm)
}

/** Builds a `flowable:Field` in the child-element form the editor always writes. */
export function createField(moddle: Moddle, value: FieldValue): ModdleElement {
  const field = moddle.create('flowable:Field', { name: value.name })
  if (value.isExpression) field.set('expression', value.value)
  else field.set('string', value.value)
  return field
}

/**
 * Rewrites every attribute-form field on an element into the child-element form. Backs the
 * "Normalise fields" action; it never runs implicitly, because silently rewriting an
 * imported model is exactly what PROMPT 7.5.4 forbids.
 */
export function normaliseFields(moddle: Moddle, element: ModdleElement): ModdleElement[] {
  return fieldElements(element).map((field) => {
    if (!isAttributeForm(field)) return field
    const value = readField(field)
    const normalised = createField(moddle, value)
    // Drop the attribute form so the value has exactly one home.
    normalised.set('stringValue', undefined)
    return normalised
  })
}

/**
 * The names the HTTP group owns. They are hidden from the raw Fields list, so an HTTP
 * task's configuration has exactly one editor rather than two that disagree.
 */
export const HTTP_FIELD_NAMES = [
  'requestMethod',
  'requestUrl',
  'requestHeaders',
  'requestBody',
  'requestBodyEncoding',
  'requestTimeout',
  'disallowRedirects',
  'failStatusCodes',
  'handleStatusCodes',
  'ignoreException',
  'responseVariableName',
  'saveRequestVariables',
  'saveResponseParameters',
  'saveResponseParametersTransient',
  'saveResponseVariableAsJson',
  'resultVariablePrefix',
] as const

export type HttpFieldName = (typeof HTTP_FIELD_NAMES)[number]

export function isHttpOwnedField(name: string): boolean {
  return (HTTP_FIELD_NAMES as readonly string[]).includes(name)
}
