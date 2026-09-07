import { attributeEntry, checkboxEntry } from '../entries'
import type { EntryContext, PanelEntry } from '../entries'

export function assignmentGroup(context: EntryContext): PanelEntry[] {
  return [
    attributeEntry(context, {
      id: 'assignee',
      label: 'Assignee',
      attribute: 'flowable:assignee',
      description: 'A user id, or a JUEL expression resolving to one.',
    }),
    attributeEntry(context, {
      id: 'candidateUsers',
      label: 'Candidate users',
      attribute: 'flowable:candidateUsers',
      description: 'Comma-separated user ids who may claim this task.',
    }),
    attributeEntry(context, {
      id: 'candidateGroups',
      label: 'Candidate groups',
      attribute: 'flowable:candidateGroups',
      description: 'Comma-separated group ids whose members may claim this task.',
    }),
    attributeEntry(context, {
      id: 'dueDate',
      label: 'Due date',
      attribute: 'flowable:dueDate',
      monospace: true,
      description: 'An ISO 8601 instant or duration, or an expression resolving to one.',
    }),
    attributeEntry(context, {
      id: 'priority',
      label: 'Priority',
      attribute: 'flowable:priority',
      description: 'An integer. Flowable treats 50 as the default.',
    }),
    checkboxEntry(context, {
      id: 'formFieldValidation',
      label: 'Validate form fields',
      attribute: 'flowable:formFieldValidation',
    }),
  ]
}

export function asyncGroup(context: EntryContext): PanelEntry[] {
  const { element, modeling, moddle } = context
  const businessObject = element.businessObject

  return [
    checkboxEntry(context, {
      id: 'async',
      label: 'Asynchronous before',
      attribute: 'flowable:async',
      description: 'The engine commits before this activity and continues it in a job.',
    }),
    checkboxEntry(context, {
      id: 'asyncLeave',
      label: 'Asynchronous after',
      attribute: 'flowable:asyncLeave',
    }),
    checkboxEntry(context, {
      id: 'exclusive',
      label: 'Exclusive',
      attribute: 'flowable:exclusive',
      description: 'Jobs of the same process instance do not run in parallel.',
    }),
    {
      ...attributeEntry(context, {
        id: 'failedJobRetryTimeCycle',
        label: 'Retry time cycle',
        attribute: '__retryTimeCycle',
        monospace: true,
        description: 'An ISO 8601 repeating interval, for example R3/PT10M.',
      }),
      // Stored as an extension element, so the generic attribute accessors are replaced.
      getValue: () => readRetryCycle(businessObject),
      setValue: (value: string) =>
        writeRetryCycle(element, businessObject, modeling, moddle, value),
    },
  ]
}

function readRetryCycle(businessObject: any): string {
  const values = businessObject.get('extensionElements')?.get('values') ?? []
  const cycle = values.find((value: any) => value.$type === 'flowable:FailedJobRetryTimeCycle')
  return cycle?.get('body') ?? ''
}

function writeRetryCycle(
  element: any,
  businessObject: any,
  modeling: any,
  moddle: any,
  value: string,
) {
  let extensionElements = businessObject.get('extensionElements')
  if (!extensionElements) {
    extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
    modeling.updateModdleProperties(element, businessObject, { extensionElements })
  }
  const values: any[] = extensionElements.get('values') ?? []
  const existing = values.find(
    (candidate) => candidate.$type === 'flowable:FailedJobRetryTimeCycle',
  )

  if (value === '') {
    if (!existing) return
    modeling.updateModdleProperties(element, extensionElements, {
      values: values.filter((candidate) => candidate !== existing),
    })
    return
  }

  if (existing) {
    modeling.updateModdleProperties(element, existing, { body: value })
    return
  }

  const cycle = moddle.create('flowable:FailedJobRetryTimeCycle', { body: value })
  modeling.updateModdleProperties(element, extensionElements, { values: [...values, cycle] })
}
