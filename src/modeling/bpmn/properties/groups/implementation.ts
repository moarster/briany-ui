import { ALLOWED_SERVICE_TASK_TYPES } from '../../constants'
import { attributeEntry, customSelectEntry, selectEntry } from '../entries'
import type { EntryContext, PanelEntry } from '../entries'

export type ImplementationKind = 'delegateExpression' | 'expression' | 'http' | 'external' | 'none'

/**
 * Reads which implementation a service task uses. `class` is deliberately not one of the
 * offered kinds - class-based implementation is hidden from the panel entirely - but an
 * imported model that uses one still reports it, so the panel can say what it sees.
 */
export function readImplementation(businessObject: any): ImplementationKind | 'class' {
  if (businessObject.get('flowable:type') === 'http') return 'http'
  if (businessObject.get('flowable:delegateExpression')) return 'delegateExpression'
  if (businessObject.get('flowable:expression')) return 'expression'
  if (businessObject.get('flowable:class')) return 'class'
  if (businessObject.get('flowable:type') === 'external-worker') return 'external'
  return 'none'
}

/**
 * The Implementation group: a closed selector over the four ways this platform lets a
 * service task do work. `HTTP` is the only value the panel ever writes to `flowable:type`,
 * so `shell` and every other engine type are unreachable from the UI (PROMPT 1.5).
 */
export function implementationGroup(
  context: EntryContext,
  allowedDelegateBeans: string[],
): PanelEntry[] {
  const { element, modeling } = context
  const businessObject = element.businessObject
  const kind = readImplementation(businessObject)

  const entries: PanelEntry[] = [
    customSelectEntry(context, {
      id: 'implementationKind',
      label: 'Implementation',
      description: 'How this task does its work.',
      allowEmpty: false,
      options: [
        { value: 'none', label: '<none>' },
        { value: 'delegateExpression', label: 'Delegate expression' },
        { value: 'expression', label: 'Expression' },
        { value: 'http', label: 'HTTP' },
        { value: 'external', label: 'External worker' },
      ],
      getValue: () => (kind === 'class' ? 'none' : kind),
      setValue: (next: string) => {
        // Switching implementation clears the other kinds, so a task never carries two.
        modeling.updateModdleProperties(element, businessObject, {
          'flowable:delegateExpression': undefined,
          'flowable:expression': undefined,
          // `flowable:class` is cleared here too: the panel does not offer it, so leaving
          // one behind would be an invisible setting the author cannot see or remove.
          'flowable:class': undefined,
          'flowable:type':
            next === 'http'
              ? ALLOWED_SERVICE_TASK_TYPES[0]
              : next === 'external'
                ? 'external-worker'
                : undefined,
        })
      },
    }),
  ]

  if (kind === 'delegateExpression') {
    // A select, never free text: `SafeBpmnDeploymentValidator` rejects anything outside
    // the allowlist, so offering free text would only produce a deploy failure later.
    entries.push(
      selectEntry(context, {
        id: 'delegateExpression',
        label: 'Delegate',
        attribute: 'flowable:delegateExpression',
        description:
          allowedDelegateBeans.length > 0
            ? 'Only the beans this engine allows are offered.'
            : 'This engine publishes no delegate beans.',
        options: allowedDelegateBeans.map((bean) => ({ value: `\${${bean}}`, label: bean })),
      }),
    )
  }

  if (kind === 'expression') {
    entries.push(
      attributeEntry(context, {
        id: 'expression',
        label: 'Expression',
        attribute: 'flowable:expression',
        monospace: true,
        description: 'A JUEL expression, for example ${myBean.doWork(execution)}.',
      }),
    )
  }

  if (kind !== 'none' && kind !== 'class') {
    entries.push(
      attributeEntry(context, {
        id: 'resultVariableName',
        label: 'Result variable',
        attribute: 'flowable:resultVariableName',
        monospace: true,
      }),
    )
  }

  entries.push(
    attributeEntry(context, {
      id: 'skipExpression',
      label: 'Skip expression',
      attribute: 'flowable:skipExpression',
      monospace: true,
      description: 'When it evaluates to true, the engine skips this task.',
    }),
  )

  return entries
}
