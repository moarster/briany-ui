import { Group } from '@bpmn-io/properties-panel'
import type { BpmnElementDescriptorRoot as BpmnElementDescriptor } from '../../../../api'
import {
  customCheckboxEntry,
  customEntry,
  customSelectEntry,
  customTextAreaEntry,
} from '../entries'
import type { EntryContext } from '../entries'
import { compileDescriptor } from './compiler'
import type { DescriptorState, PropertyValue, WriteOperation } from './compiler'
import { readDescriptorState, writeDescriptorValue } from './moddle-bridge'

const HIGH_PRIORITY = 700

/**
 * Generated groups. When an element carries `briany:descriptorId`, the descriptor pinned
 * by `briany:descriptorVersion` is compiled into one group titled with the descriptor's
 * name, plus an action that unlinks the element and returns it to the generic groups.
 *
 * Pinning by version is what lets an older process keep rendering against its own
 * descriptor revision, which is exactly what `BpmnElementDescriptor.version` promises.
 */
export class DescriptorPropertiesProvider {
  static $inject = [
    'propertiesPanel',
    'injector',
    'translate',
    'debounceInput',
    'brianyDescriptors',
  ]

  private readonly injector: any
  private readonly translate: (text: string) => string
  private readonly debounce: (fn: any) => any
  private readonly descriptors: BpmnElementDescriptor[]

  constructor(
    propertiesPanel: any,
    injector: any,
    translate: (text: string) => string,
    debounceInput: (fn: any) => any,
    brianyDescriptors: BpmnElementDescriptor[],
  ) {
    this.injector = injector
    this.translate = translate
    this.debounce = debounceInput
    this.descriptors = brianyDescriptors
    propertiesPanel.registerProvider(HIGH_PRIORITY, this)
  }

  getGroups(element: any) {
    return (groups: any[]) => {
      const descriptor = this.resolve(element)
      if (!descriptor) return groups

      const context: EntryContext = {
        element,
        modeling: this.injector.get('modeling'),
        moddle: this.injector.get('moddle'),
        translate: this.translate,
        debounce: this.debounce,
      }

      const state = readDescriptorState(element.businessObject, descriptor)
      const { entries, writes } = compileDescriptor(descriptor, state)

      // Hidden fields and removals are applied as soon as the group renders, because the
      // compiler's contract is that a hidden field's XML is not merely unrendered but gone.
      applySilentWrites(context, descriptor, state, writes)

      const panelEntries = entries.map((entry) => {
        const set = (value: PropertyValue) => {
          const nextState: DescriptorState = { ...state, [entry.key]: value }
          const recompiled = compileDescriptor(descriptor, nextState)
          for (const write of recompiled.writes) writeDescriptorValue(context, write)
        }

        const common = {
          id: `descriptor-${descriptor.id}-${entry.key}`,
          label: entry.label,
          description: entry.description ?? entry.tooltip,
        }

        switch (entry.kind) {
          case 'boolean':
            return customCheckboxEntry(context, {
              ...common,
              getValue: () => entry.value === true || entry.value === 'true',
              setValue: (value: boolean) => set(value),
            })
          case 'dropdown':
            return customSelectEntry(context, {
              ...common,
              options: (entry.options ?? []).map((option) => ({
                value: String(option.value),
                label: option.label,
              })),
              getValue: () => (entry.value === undefined ? '' : String(entry.value)),
              setValue: (value: string) => set(value === '' ? undefined : value),
            })
          case 'text':
            return customTextAreaEntry(context, {
              ...common,
              monospace: entry.juel !== 'forbidden',
              getValue: () => (entry.value === undefined ? '' : String(entry.value)),
              setValue: (value: string) => set(value === '' ? undefined : value),
            })
          default:
            return customEntry(context, {
              ...common,
              // `juel: required` locks the field to an expression, so it reads as code.
              monospace: entry.juel !== 'forbidden',
              disabled: !entry.editable,
              getValue: () => (entry.value === undefined ? '' : String(entry.value)),
              setValue: (value: string) => set(value === '' ? undefined : value),
            })
        }
      })

      const unlink = customEntry(context, {
        id: `descriptor-${descriptor.id}-unlink`,
        label: 'Unlink element',
        description:
          'Removes the descriptor annotation and returns this element to the generic ' +
          'groups. The values it already wrote stay in the XML. Type "unlink" to confirm.',
        getValue: () => '',
        setValue: (value: string) => {
          if (value.trim().toLowerCase() !== 'unlink') return
          context.modeling.updateModdleProperties(element, element.businessObject, {
            'briany:descriptorId': undefined,
            'briany:descriptorVersion': undefined,
          })
        },
      })

      return [
        ...groups,
        {
          id: `descriptor-${descriptor.id}`,
          label: descriptor.name,
          component: Group,
          entries: [...panelEntries, unlink],
        },
      ]
    }
  }

  /** Pinned by version, so an older process keeps its own descriptor revision. */
  private resolve(element: any): BpmnElementDescriptor | undefined {
    const id = element.businessObject?.get?.('briany:descriptorId') as string | undefined
    if (!id) return undefined
    const version = element.businessObject.get('briany:descriptorVersion') as number | undefined
    const matching = this.descriptors.filter((descriptor) => descriptor.id === id)
    if (matching.length === 0) return undefined
    return (
      matching.find((descriptor) => descriptor.version === version) ??
      matching.reduce((latest, candidate) =>
        candidate.version > latest.version ? candidate : latest,
      )
    )
  }
}

/**
 * Applies the writes that are not driven by a visible entry: `Hidden` constants and the
 * removal of XML belonging to fields a condition has hidden. Only writes that actually
 * change something reach the command stack, so this does not mark the file dirty on open.
 */
function applySilentWrites(
  context: EntryContext,
  descriptor: BpmnElementDescriptor,
  state: DescriptorState,
  writes: WriteOperation[],
) {
  const visibleKeys = new Set(
    compileDescriptor(descriptor, state).entries.map((entry) => entry.key),
  )
  for (const write of writes) {
    const key = write.kind === 'field' ? write.name : undefined
    if (key !== undefined && visibleKeys.has(key)) continue
    writeDescriptorValue(context, write, { onlyIfChanged: true })
  }
}

export const descriptorPropertiesProviderModule = {
  __init__: ['descriptorPropertiesProvider'],
  descriptorPropertiesProvider: ['type', DescriptorPropertiesProvider],
}
