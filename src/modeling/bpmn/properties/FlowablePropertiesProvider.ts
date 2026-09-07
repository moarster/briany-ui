import { Group } from '@bpmn-io/properties-panel'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import type { EngineCapabilities } from '../../../api'
import { EXCLUSION_RATIONALE, isExcludedElement } from '../constants'
import { isHttpTask } from '../renderer/HttpTaskRenderer'
import type { EntryContext } from './entries'
import { assignmentGroup, asyncGroup } from './groups/assignment'
import { callActivityGroup, conditionGroup } from './groups/condition'
import { documentationGroup, generalGroup } from './groups/general'
import { fieldsGroup } from './groups/fields'
import { httpGroup } from './groups/http'
import { implementationGroup, readImplementation } from './groups/implementation'
import { multiInstanceGroup } from './groups/multiInstance'
import { isForbiddenServiceTaskType } from '../constants'

const LOW_PRIORITY = 500

/**
 * The hand-written Flowable groups, in the order PROMPT 7.5.5 specifies: General and
 * Documentation first, engine wiring below. Web Modeler separates "draw the shape" from
 * "wire it to the engine"; this ordering is how we do the same.
 *
 * Two groups are deliberately NOT here: Form binding and the decision picker. Both are
 * comboboxes over this application's files plus what is deployed - React state, backed by
 * queries, that a preact panel provider cannot reach. They are rendered by the editor
 * shell directly above this panel, in `BpmnEditor`, against the same selected element.
 */
export class FlowablePropertiesProvider {
  static $inject = [
    'propertiesPanel',
    'injector',
    'translate',
    'debounceInput',
    'brianyCapabilities',
  ]

  private readonly injector: any
  private readonly translate: (text: string) => string
  private readonly debounce: (fn: any) => any
  private readonly capabilities: EngineCapabilities

  constructor(
    propertiesPanel: any,
    injector: any,
    translate: (text: string) => string,
    debounceInput: (fn: any) => any,
    brianyCapabilities: EngineCapabilities,
  ) {
    this.injector = injector
    this.translate = translate
    this.debounce = debounceInput
    this.capabilities = brianyCapabilities
    propertiesPanel.registerProvider(LOW_PRIORITY, this)
  }

  getGroups(element: any) {
    return (groups: any[]) => {
      const context: EntryContext = {
        element,
        modeling: this.injector.get('modeling'),
        moddle: this.injector.get('moddle'),
        translate: this.translate,
        debounce: this.debounce,
      }

      const next: unknown[] = [
        group('general', 'General', generalGroup(context)),
        group('documentation', 'Documentation', documentationGroup(context)),
      ]

      // An element the product refuses to support shows only General and Documentation,
      // plus a notice. It is never edited in place and never silently deleted; the canvas
      // action to convert it lives in the editor shell (PROMPT 1.5).
      if (
        isExcludedElement(element.businessObject) ||
        isForbiddenServiceTaskType(element.businessObject?.get?.('flowable:type'))
      ) {
        next.push(unsupportedNotice(this.translate))
        return [...next, ...groups.filter((existing) => existing.id === 'BpmnDescriptor')]
      }

      if (is(element, 'bpmn:UserTask')) {
        next.push(group('assignment', 'Assignment', assignmentGroup(context)))
      }

      if (is(element, 'bpmn:ServiceTask') || is(element, 'bpmn:SendTask')) {
        next.push(
          group(
            'implementation',
            'Implementation',
            implementationGroup(context, this.capabilities.allowedDelegateBeans),
          ),
        )
        if (isHttpTask(element)) {
          next.push(group('http', 'HTTP', httpGroup(context)))
        }
        // Fields the HTTP group owns are hidden from this list, so a value has one editor.
        next.push(fieldsGroup(context))
      }

      if (is(element, 'bpmn:CallActivity')) {
        next.push(group('called-element', 'Called element', callActivityGroup(context)))
      }

      if (is(element, 'bpmn:Activity')) {
        next.push(group('multi-instance', 'Multi-instance', multiInstanceGroup(context)))
        next.push(group('async', 'Async', asyncGroup(context)))
      }

      if (is(element, 'bpmn:SequenceFlow')) {
        next.push(group('condition', 'Condition', conditionGroup(context)))
      }

      // Descriptor-generated groups are contributed by DescriptorPropertiesProvider and
      // arrive in `groups`; keep them after the hand-written ones.
      return [...next, ...groups]
    }
  }
}

function group(id: string, label: string, entries: unknown[]) {
  return { id, label, component: Group, entries: entries.filter(Boolean) }
}

/** Says plainly why the element cannot be configured, and what to use instead. */
function unsupportedNotice(translate: (text: string) => string) {
  return {
    id: 'briany-unsupported',
    label: translate('Not supported'),
    component: Group,
    entries: [
      {
        id: 'briany-unsupported-notice',
        component: () => null,
        // The visible text lives in the group label and description; the editor shell
        // renders the actionable banner, because a panel entry cannot offer a canvas edit.
        description: EXCLUSION_RATIONALE,
      },
    ],
  }
}

export const flowablePropertiesProviderModule = {
  __init__: ['flowablePropertiesProvider'],
  flowablePropertiesProvider: ['type', FlowablePropertiesProvider],
}

export { readImplementation }
