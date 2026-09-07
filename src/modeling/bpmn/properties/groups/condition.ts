import { attributeEntry, checkboxEntry, customCheckboxEntry } from '../entries'
import type { EntryContext, PanelEntry } from '../entries'

/** Condition on a sequence flow, plus the default-flow marker on its source gateway. */
export function conditionGroup(context: EntryContext): PanelEntry[] {
  const { element, modeling, moddle } = context
  const businessObject = element.businessObject
  const source = element.source?.businessObject

  const entries: PanelEntry[] = [
    {
      ...attributeEntry(context, {
        id: 'conditionExpression',
        label: 'Condition expression',
        attribute: '__condition',
        monospace: true,
        description: 'A JUEL expression, for example ${amount > 1000}.',
      }),
      getValue: () => businessObject.get('conditionExpression')?.get('body') ?? '',
      setValue: (value: string) =>
        modeling.updateModdleProperties(element, businessObject, {
          conditionExpression:
            value === '' ? undefined : moddle.create('bpmn:FormalExpression', { body: value }),
        }),
    },
  ]

  if (source && typeof source.get('default') !== 'undefined') {
    entries.push(
      customCheckboxEntry(context, {
        id: 'isDefaultFlow',
        label: 'Default flow',
        description:
          'Taken when no other outgoing condition holds. A default flow has no condition.',
        getValue: () => source.get('default') === businessObject,
        setValue: (value: boolean) =>
          modeling.updateModdleProperties(element, source, {
            default: value ? businessObject : undefined,
          }),
      }),
    )
  }

  return entries
}

/** Call activity: which process it calls and how data crosses the boundary. */
export function callActivityGroup(context: EntryContext): PanelEntry[] {
  return [
    attributeEntry(context, {
      id: 'calledElement',
      label: 'Called process key',
      attribute: 'calledElement',
      monospace: true,
    }),
    attributeEntry(context, {
      id: 'callBusinessKey',
      label: 'Business key',
      attribute: 'flowable:businessKey',
      monospace: true,
    }),
    checkboxEntry(context, {
      id: 'inheritBusinessKey',
      label: 'Inherit business key',
      attribute: 'flowable:inheritBusinessKey',
    }),
    checkboxEntry(context, {
      id: 'sameDeployment',
      label: 'Same deployment',
      attribute: 'flowable:sameDeployment',
      description: 'Resolve the called process inside this deployment before looking globally.',
    }),
  ]
}
