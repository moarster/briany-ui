import type {
  BpmnElementDescriptorRoot as BpmnElementDescriptor,
  BpmnElementDescriptorBpmnElementProperty as BpmnElementProperty,
} from '../../../../api'

/**
 * The descriptor compiler. Pure and framework-free: it never touches React or bpmn-js.
 * Descriptor plus current element state in, a list of panel entries and a set of moddle
 * write operations out.
 *
 * This is the piece most likely to grow, which is exactly why it is isolated and unit
 * tested against every binding and condition case in BpmnElementDescriptor.yaml.
 */

export type PropertyValue = string | number | boolean | undefined

/** The element's current values, keyed by descriptor property key. */
export type DescriptorState = Record<string, PropertyValue>

export type CompiledEntry = {
  key: string
  label: string
  /** The panel component to render. `Hidden` fields never produce an entry. */
  kind: 'string' | 'number' | 'text' | 'boolean' | 'dropdown'
  value: PropertyValue
  description?: string
  tooltip?: string
  placeholder?: string
  options?: { value: PropertyValue; label: string }[]
  required: boolean
  editable: boolean
  /**
   * `forbidden` renders a plain field, `optional` renders a constant/expression toggle,
   * `required` locks the field to an expression.
   */
  juel: 'forbidden' | 'optional' | 'required'
  /** Populated when the current value fails validation. */
  error?: string
}

/** Where a value goes in the XML. Executed by the moddle writer, not by the compiler. */
export type WriteOperation =
  | { kind: 'attribute'; attribute: string; value: string | undefined }
  | { kind: 'field'; name: string; value: string | undefined; asExpression: boolean }
  | { kind: 'childTagAttribute'; tag: string; attribute: string; value: string | undefined }
  | { kind: 'childTagText'; tag: string; value: string | undefined }

export type CompileResult = {
  entries: CompiledEntry[]
  writes: WriteOperation[]
}

export function compileDescriptor(
  descriptor: BpmnElementDescriptor,
  state: DescriptorState,
): CompileResult {
  const active = activeProperties(descriptor.properties, state)
  const entries: CompiledEntry[] = []
  const writes: WriteOperation[] = []

  for (const property of descriptor.properties) {
    const key = property.key
    if (key === undefined) continue

    // A field hidden by `condition` is not rendered AND not written, and any existing XML
    // for it is removed - hence the explicit `undefined` write below.
    if (!active.has(key)) {
      const removal = writeFor(property, undefined)
      if (removal) writes.push(removal)
      continue
    }

    const value = resolveValue(property, state)

    if (property.type === 'Hidden') {
      // Not rendered, but it participates in binding: `defaultValue` is a constant baked
      // into the XML, which is how a descriptor pins a delegate.
      const write = writeFor(property, value)
      if (write) writes.push(write)
      continue
    }

    entries.push({
      key,
      label: property.label ?? key,
      kind: kindOf(property),
      value,
      description: property.description,
      tooltip: property.tooltip,
      placeholder: property.placeholder,
      options: property.values?.map((option) => ({
        value: option.value as PropertyValue,
        label: option.label,
      })),
      // `required` is ignored when the field is hidden by condition, which is why this
      // runs only for active properties.
      required: property.required === true,
      editable: property.editable !== false,
      juel: property.juel ?? 'forbidden',
      error: validate(property, value),
    })

    const write = writeFor(property, value)
    if (write) writes.push(write)
  }

  return { entries, writes }
}

/**
 * Which properties are visible. Evaluated iteratively because `isActive` lets one
 * condition depend on another field's visibility.
 */
export function activeProperties(
  properties: BpmnElementProperty[],
  state: DescriptorState,
): Set<string> {
  const keys = properties
    .map((property) => property.key)
    .filter((key): key is string => key !== undefined)
  let active = new Set(keys)

  // Fixed point: at most one pass per property, since each pass can only remove.
  for (let pass = 0; pass < properties.length + 1; pass += 1) {
    const next = new Set<string>()
    for (const property of properties) {
      const key = property.key
      if (key === undefined) continue
      if (isVisible(property, state, active)) next.add(key)
    }
    if (next.size === active.size) return next
    active = next
  }

  return active
}

function isVisible(
  property: BpmnElementProperty,
  state: DescriptorState,
  active: Set<string>,
): boolean {
  const condition = property.condition
  if (!condition) return true

  if (condition.allMatch) {
    return condition.allMatch.every((term) => matches(term, state, active))
  }
  return matches(condition, state, active)
}

function matches(
  term: { property?: string; equals?: unknown; oneOf?: unknown[]; isActive?: boolean },
  state: DescriptorState,
  active: Set<string>,
): boolean {
  if (term.property === undefined) return true

  if (term.isActive !== undefined) {
    return active.has(term.property) === term.isActive
  }

  const value = state[term.property]
  if (term.equals !== undefined) return value === term.equals
  if (term.oneOf !== undefined) return term.oneOf.includes(value)

  return true
}

function resolveValue(property: BpmnElementProperty, state: DescriptorState): PropertyValue {
  const key = property.key
  const current = key === undefined ? undefined : state[key]
  if (current !== undefined && current !== '') return current
  return property.defaultValue as PropertyValue
}

function kindOf(property: BpmnElementProperty): CompiledEntry['kind'] {
  switch (property.type) {
    case 'Number':
      return 'number'
    case 'Text':
      return 'text'
    case 'Boolean':
      return 'boolean'
    case 'Dropdown':
      return 'dropdown'
    default:
      return 'string'
  }
}

export function validate(property: BpmnElementProperty, value: PropertyValue): string | undefined {
  const empty = value === undefined || value === ''

  if (property.required === true && empty) {
    return `${property.label ?? property.key} is required.`
  }
  if (empty) return undefined

  const text = String(value)

  if (property.juel === 'required' && !text.trim().startsWith('${')) {
    return 'This value must be a JUEL expression, for example ${myVariable}.'
  }

  if (property.pattern) {
    const expression = new RegExp(property.pattern.value)
    if (!expression.test(text)) {
      return property.pattern.message ?? `The value must match ${property.pattern.value}.`
    }
  }

  return undefined
}

/**
 * The binding rules, straight from BpmnElementDescriptor.yaml:
 *
 * | `binding` | Behaviour |
 * |---|---|
 * | absent | UI-only field, never serialised |
 * | present, no `tag`/`attribute` | `<flowable:field name="{key}">` with a string or expression body |
 * | `attribute` only | attribute on the element root |
 * | `tag` + `attribute` | attribute on that child tag |
 * | `tag` only | child tag whose text content is the value |
 */
export function writeFor(
  property: BpmnElementProperty,
  value: PropertyValue,
): WriteOperation | null {
  const binding = property.binding
  // No binding means the field is UI-only - typically a control that other fields'
  // `condition` reads. It is never written to XML.
  if (binding === undefined) return null

  const key = property.key
  if (key === undefined) return null

  const serialised = value === undefined || value === '' ? undefined : String(value)

  if (binding.tag && binding.attribute) {
    return {
      kind: 'childTagAttribute',
      tag: binding.tag,
      attribute: binding.attribute,
      value: serialised,
    }
  }
  if (binding.attribute) {
    return { kind: 'attribute', attribute: binding.attribute, value: serialised }
  }
  if (binding.tag) {
    return { kind: 'childTagText', tag: binding.tag, value: serialised }
  }

  // The default: a flowable:field named after the key, whose body is a <flowable:string>
  // or a <flowable:expression> depending on the JUEL mode of the value.
  const asExpression =
    property.juel === 'required' ||
    (property.juel === 'optional' && serialised !== undefined && serialised.trim().startsWith('${'))

  return { kind: 'field', name: key, value: serialised, asExpression }
}
