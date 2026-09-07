import { is } from 'bpmn-js/lib/util/ModelUtil'
import { attributeEntry, checkboxEntry, textAreaEntry } from '../entries'
import type { EntryContext, PanelEntry } from '../entries'

/** General and Documentation come first on every element, before any engine wiring. */
export function generalGroup(context: EntryContext): PanelEntry[] {
  const { element } = context
  const entries: PanelEntry[] = [
    attributeEntry(context, { id: 'id', label: 'ID', attribute: 'id', monospace: true }),
    attributeEntry(context, { id: 'name', label: 'Name', attribute: 'name' }),
  ]

  if (
    is(element, 'bpmn:Process') ||
    (is(element, 'bpmn:Participant') && element.businessObject.processRef)
  ) {
    entries.push(
      checkboxEntry(context, {
        id: 'isExecutable',
        label: 'Executable',
        attribute: 'isExecutable',
        description:
          'Flowable creates no process definition for a non-executable process. Leave this on.',
      }),
      attributeEntry(context, {
        id: 'candidateStarterUsers',
        label: 'Candidate starter users',
        attribute: 'flowable:candidateStarterUsers',
        description: 'Comma-separated user ids.',
      }),
      attributeEntry(context, {
        id: 'candidateStarterGroups',
        label: 'Candidate starter groups',
        attribute: 'flowable:candidateStarterGroups',
        description: 'Comma-separated group ids.',
      }),
    )
  }

  return entries
}

export function documentationGroup(context: EntryContext): PanelEntry[] {
  const { element, modeling, moddle } = context
  const businessObject = element.businessObject

  return [
    textAreaEntry(
      { ...context },
      {
        id: 'documentation',
        label: 'Element documentation',
        attribute: '__documentation',
        rows: 4,
      },
    ),
  ].map((entry) => ({
    ...entry,
    // `bpmn:documentation` is a child element, not an attribute, so the generic factory's
    // getter and setter are replaced here.
    getValue: () => {
      const documentation = businessObject.get('documentation') as { text?: string }[] | undefined
      return documentation?.[0]?.text ?? ''
    },
    setValue: (value: string) => {
      const existing = (businessObject.get('documentation') as any[] | undefined) ?? []
      if (value === '') {
        modeling.updateModdleProperties(element, businessObject, { documentation: [] })
        return
      }
      if (existing.length > 0) {
        modeling.updateModdleProperties(element, existing[0], { text: value })
        return
      }
      const documentation = moddle.create('bpmn:Documentation', { text: value })
      modeling.updateModdleProperties(element, businessObject, { documentation: [documentation] })
    },
  }))
}
