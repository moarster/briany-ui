import {
  CheckboxEntry,
  SelectEntry,
  TextAreaEntry,
  TextFieldEntry,
  isCheckboxEntryEdited,
  isSelectEntryEdited,
  isTextAreaEntryEdited,
  isTextFieldEntryEdited,
} from '@bpmn-io/properties-panel'
import type { ModdleElement } from './fields'

/**
 * Thin factories over the bpmn-io entry primitives. They exist so a group declares what a
 * property is, not how a panel row is wired: `element`, `modeling`, `getValue`, `setValue`
 * are spelled out once here rather than in every group.
 */

export type EntryContext = {
  element: any
  modeling: any
  moddle: any
  translate: (text: string) => string
  debounce: (fn: (...args: any[]) => void) => (...args: any[]) => void
}

export type PanelEntry = {
  id: string
  component: unknown
  isEdited?: unknown
  [key: string]: unknown
}

function businessObject(element: any): ModdleElement {
  return element.businessObject
}

/** A `flowable:` (or plain BPMN) attribute on the element root. */
export function attributeEntry(
  context: EntryContext,
  options: {
    id: string
    label: string
    attribute: string
    description?: string
    tooltip?: string
    disabled?: boolean
    monospace?: boolean
  },
): PanelEntry {
  const { element, modeling, debounce, translate } = context
  return {
    id: options.id,
    component: TextFieldEntry,
    isEdited: isTextFieldEntryEdited,
    element,
    label: translate(options.label),
    description: options.description,
    tooltip: options.tooltip,
    disabled: options.disabled,
    monospace: options.monospace,
    debounce,
    getValue: () => businessObject(element).get(options.attribute) ?? '',
    setValue: (value: string) =>
      modeling.updateModdleProperties(element, businessObject(element), {
        [options.attribute]: value === '' ? undefined : value,
      }),
  }
}

export function textAreaEntry(
  context: EntryContext,
  options: { id: string; label: string; attribute: string; description?: string; rows?: number },
): PanelEntry {
  const { element, modeling, debounce, translate } = context
  return {
    id: options.id,
    component: TextAreaEntry,
    isEdited: isTextAreaEntryEdited,
    element,
    label: translate(options.label),
    description: options.description,
    rows: options.rows ?? 2,
    debounce,
    getValue: () => businessObject(element).get(options.attribute) ?? '',
    setValue: (value: string) =>
      modeling.updateModdleProperties(element, businessObject(element), {
        [options.attribute]: value === '' ? undefined : value,
      }),
  }
}

export function checkboxEntry(
  context: EntryContext,
  options: { id: string; label: string; attribute: string; description?: string },
): PanelEntry {
  const { element, modeling, translate } = context
  return {
    id: options.id,
    component: CheckboxEntry,
    isEdited: isCheckboxEntryEdited,
    element,
    label: translate(options.label),
    description: options.description,
    getValue: () => businessObject(element).get(options.attribute) === true,
    setValue: (value: boolean) =>
      modeling.updateModdleProperties(element, businessObject(element), {
        [options.attribute]: value === true ? true : undefined,
      }),
  }
}

/**
 * A closed select. Used wherever the engine constrains the value - the delegate picker and
 * `flowable:type` are selects precisely so free text cannot produce a model the engine
 * rejects.
 */
export function selectEntry(
  context: EntryContext,
  options: {
    id: string
    label: string
    attribute: string
    description?: string
    options: { value: string; label: string }[]
    /** Maps the stored attribute value to and from the option value. */
    toStored?: (value: string) => string | undefined
    fromStored?: (value: string | undefined) => string
  },
): PanelEntry {
  const { element, modeling, translate } = context
  const toStored = options.toStored ?? ((value: string) => (value === '' ? undefined : value))
  const fromStored = options.fromStored ?? ((value: string | undefined) => value ?? '')

  return {
    id: options.id,
    component: SelectEntry,
    isEdited: isSelectEntryEdited,
    element,
    label: translate(options.label),
    description: options.description,
    getValue: () =>
      fromStored(businessObject(element).get(options.attribute) as string | undefined),
    setValue: (value: string) =>
      modeling.updateModdleProperties(element, businessObject(element), {
        [options.attribute]: toStored(value),
      }),
    getOptions: () => [{ value: '', label: translate('<none>') }, ...options.options],
  }
}

/** An entry backed by an arbitrary getter and setter, for values that are not attributes. */
export function customEntry(
  context: EntryContext,
  options: {
    id: string
    label: string
    description?: string
    monospace?: boolean
    disabled?: boolean
    getValue: () => string
    setValue: (value: string) => void
  },
): PanelEntry {
  const { element, debounce, translate } = context
  return {
    id: options.id,
    component: TextFieldEntry,
    isEdited: isTextFieldEntryEdited,
    element,
    label: translate(options.label),
    description: options.description,
    monospace: options.monospace,
    disabled: options.disabled,
    debounce,
    getValue: options.getValue,
    setValue: options.setValue,
  }
}

export function customSelectEntry(
  context: EntryContext,
  options: {
    id: string
    label: string
    description?: string
    options: { value: string; label: string }[]
    getValue: () => string
    setValue: (value: string) => void
    allowEmpty?: boolean
  },
): PanelEntry {
  const { element, translate } = context
  return {
    id: options.id,
    component: SelectEntry,
    isEdited: isSelectEntryEdited,
    element,
    label: translate(options.label),
    description: options.description,
    getValue: options.getValue,
    setValue: options.setValue,
    getOptions: () =>
      options.allowEmpty === false
        ? options.options
        : [{ value: '', label: translate('<none>') }, ...options.options],
  }
}

export function customCheckboxEntry(
  context: EntryContext,
  options: {
    id: string
    label: string
    description?: string
    getValue: () => boolean
    setValue: (value: boolean) => void
  },
): PanelEntry {
  const { element, translate } = context
  return {
    id: options.id,
    component: CheckboxEntry,
    isEdited: isCheckboxEntryEdited,
    element,
    label: translate(options.label),
    description: options.description,
    getValue: options.getValue,
    setValue: options.setValue,
  }
}

export function customTextAreaEntry(
  context: EntryContext,
  options: {
    id: string
    label: string
    description?: string
    rows?: number
    monospace?: boolean
    getValue: () => string
    setValue: (value: string) => void
  },
): PanelEntry {
  const { element, debounce, translate } = context
  return {
    id: options.id,
    component: TextAreaEntry,
    isEdited: isTextAreaEntryEdited,
    element,
    label: translate(options.label),
    description: options.description,
    rows: options.rows ?? 3,
    monospace: options.monospace,
    debounce,
    getValue: options.getValue,
    setValue: options.setValue,
  }
}
