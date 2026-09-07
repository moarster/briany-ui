import { attributeEntry, customSelectEntry } from '../entries'
import type { EntryContext, PanelEntry } from '../entries'

/**
 * Multi-instance is stored on `loopCharacteristics`, a child of the activity, so the
 * entries write through to that object rather than to the activity itself.
 */
export function multiInstanceGroup(context: EntryContext): PanelEntry[] {
  const { element, modeling, moddle } = context
  const businessObject = element.businessObject
  const loop = businessObject.get('loopCharacteristics')

  const loopType = !loop
    ? 'none'
    : loop.$type === 'bpmn:StandardLoopCharacteristics'
      ? 'standard'
      : loop.get('isSequential') === true
        ? 'sequential'
        : 'parallel'

  const entries: PanelEntry[] = [
    customSelectEntry(context, {
      id: 'loopType',
      label: 'Loop type',
      allowEmpty: false,
      options: [
        { value: 'none', label: '<none>' },
        { value: 'parallel', label: 'Parallel multi-instance' },
        { value: 'sequential', label: 'Sequential multi-instance' },
        { value: 'standard', label: 'Loop' },
      ],
      getValue: () => loopType,
      setValue: (next: string) => {
        if (next === 'none') {
          modeling.updateModdleProperties(element, businessObject, {
            loopCharacteristics: undefined,
          })
          return
        }
        if (next === 'standard') {
          modeling.updateModdleProperties(element, businessObject, {
            loopCharacteristics: moddle.create('bpmn:StandardLoopCharacteristics'),
          })
          return
        }
        const characteristics = moddle.create('bpmn:MultiInstanceLoopCharacteristics', {
          isSequential: next === 'sequential',
        })
        modeling.updateModdleProperties(element, businessObject, {
          loopCharacteristics: characteristics,
        })
      },
    }),
  ]

  if (loop && loop.$type === 'bpmn:MultiInstanceLoopCharacteristics') {
    const onLoop = (attribute: string) => ({
      getValue: () => loop.get(attribute) ?? '',
      setValue: (value: string) =>
        modeling.updateModdleProperties(element, loop, {
          [attribute]: value === '' ? undefined : value,
        }),
    })

    entries.push(
      {
        ...attributeEntry(context, {
          id: 'miCollection',
          label: 'Collection',
          attribute: 'flowable:collection',
          monospace: true,
        }),
        ...onLoop('flowable:collection'),
      },
      {
        ...attributeEntry(context, {
          id: 'miElementVariable',
          label: 'Element variable',
          attribute: 'flowable:elementVariable',
          monospace: true,
        }),
        ...onLoop('flowable:elementVariable'),
      },
      {
        ...attributeEntry(context, {
          id: 'miElementIndexVariable',
          label: 'Element index variable',
          attribute: 'flowable:elementIndexVariable',
          monospace: true,
        }),
        ...onLoop('flowable:elementIndexVariable'),
      },
      {
        ...attributeEntry(context, {
          id: 'miCardinality',
          label: 'Cardinality',
          attribute: '__cardinality',
          monospace: true,
        }),
        getValue: () => loop.get('loopCardinality')?.get('body') ?? '',
        setValue: (value: string) =>
          modeling.updateModdleProperties(element, loop, {
            loopCardinality:
              value === '' ? undefined : moddle.create('bpmn:FormalExpression', { body: value }),
          }),
      },
      {
        ...attributeEntry(context, {
          id: 'miCompletionCondition',
          label: 'Completion condition',
          attribute: '__completionCondition',
          monospace: true,
        }),
        getValue: () => loop.get('completionCondition')?.get('body') ?? '',
        setValue: (value: string) =>
          modeling.updateModdleProperties(element, loop, {
            completionCondition:
              value === '' ? undefined : moddle.create('bpmn:FormalExpression', { body: value }),
          }),
      },
    )
  }

  return entries
}
