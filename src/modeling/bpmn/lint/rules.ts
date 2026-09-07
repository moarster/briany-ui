import type { EngineCapabilities } from '../../../api'
import { EXCLUSION_RATIONALE } from '../constants'

type Node = {
  $type: string
  id?: string
  name?: string
  isExecutable?: boolean
  flowElements?: Node[]
  get?: (name: string) => unknown
  $attrs?: Record<string, unknown>
}

type Reporter = {
  report: (id: string, message: string) => void
}

type Rule = () => { check: (node: Node, reporter: Reporter) => void }

/**
 * The Briany ruleset. The first seven rules mirror `SafeBpmnDeploymentValidator` and the
 * activity whitelist one-for-one, which is the design goal: the model fails in the editor,
 * not at deploy.
 *
 * `no-script-task` and `no-shell-task` are the only rules here NOT derived from
 * `EngineCapabilities`. They are constants because PROMPT 1.5 is a product rule rather
 * than a deployment setting, and their messages say so.
 */

export function executableProcess(): ReturnType<Rule> {
  return {
    check(node, reporter) {
      if (node.$type !== 'bpmn:Process') return
      if (node.isExecutable !== true) {
        reporter.report(
          node.id ?? '',
          'The process is not executable. Flowable creates no process definition for it, so ' +
            'the file would deploy and the process would then not exist.',
        )
      }
    },
  }
}

export function singleProcess(): ReturnType<Rule> {
  let seen = 0
  return {
    check(node, reporter) {
      if (node.$type !== 'bpmn:Process') return
      seen += 1
      if (seen > 1) {
        reporter.report(
          node.id ?? '',
          'This file defines more than one process. Briany stores exactly one process per ' +
            'file, so it cannot be saved or deployed until the extra one is removed.',
        )
      }
    },
  }
}

export function noScriptTask(): ReturnType<Rule> {
  return {
    check(node, reporter) {
      if (node.$type !== 'bpmn:ScriptTask') return
      reporter.report(
        node.id ?? '',
        `Script tasks are not supported by Briany, in any script language. ${EXCLUSION_RATIONALE}`,
      )
    },
  }
}

export function noShellTask(): ReturnType<Rule> {
  return {
    check(node, reporter) {
      if (node.$type !== 'bpmn:ServiceTask' && node.$type !== 'bpmn:SendTask') return
      const type = readAttribute(node, 'flowable:type')
      if (type === undefined || type === 'http') return
      reporter.report(
        node.id ?? '',
        type === 'shell'
          ? `Shell tasks are not supported by Briany. ${EXCLUSION_RATIONALE}`
          : `flowable:type="${type}" is not available in Briany. The only engine type this ` +
              `editor supports is "http". ${EXCLUSION_RATIONALE}`,
      )
    },
  }
}

export function allowedActivityType(capabilities: EngineCapabilities): ReturnType<Rule> {
  return {
    check(node, reporter) {
      if (!capabilities.activityWhitelistEnabled) return
      if (!isActivity(node.$type)) return
      const activityType = toActivityType(node.$type)
      if (capabilities.allowedActivityTypes.includes(activityType)) return
      reporter.report(
        node.id ?? '',
        `This engine does not accept ${activityType}. It deploys ` +
          `${capabilities.allowedActivityTypes.join(', ')}.`,
      )
    },
  }
}

export function delegateAllowlist(capabilities: EngineCapabilities): ReturnType<Rule> {
  return {
    check(node, reporter) {
      const expression = readAttribute(node, 'flowable:delegateExpression')
      if (typeof expression !== 'string' || expression === '') return

      for (const bean of identifiersIn(expression)) {
        if (!capabilities.allowedDelegateBeans.includes(bean)) {
          reporter.report(
            node.id ?? '',
            `The delegate "${bean}" is not on this engine's allowlist. Allowed: ` +
              `${capabilities.allowedDelegateBeans.join(', ') || 'none'}.`,
          )
        }
      }
    },
  }
}

export function noClassImplementation(capabilities: EngineCapabilities): ReturnType<Rule> {
  return {
    check(node, reporter) {
      const className = readAttribute(node, 'flowable:class')
      if (typeof className !== 'string' || className === '') return
      const allowed = capabilities.allowedClassPrefixes.some((prefix) =>
        className.startsWith(prefix),
      )
      if (allowed) return
      reporter.report(
        node.id ?? '',
        `The class "${className}" is outside this engine's allowed prefixes ` +
          `(${capabilities.allowedClassPrefixes.join(', ') || 'none'}). Deployment will reject it.`,
      )
    },
  }
}

export function httpTaskRequiredFields(): ReturnType<Rule> {
  return {
    check(node, reporter) {
      if (node.$type !== 'bpmn:ServiceTask') return
      if (readAttribute(node, 'flowable:type') !== 'http') return

      const names = fieldNames(node)
      for (const required of ['requestMethod', 'requestUrl']) {
        if (!names.has(required)) {
          reporter.report(
            node.id ?? '',
            `The HTTP task has no ${required}. Flowable needs it to run.`,
          )
        }
      }
    },
  }
}

export function userTaskHasAssignment(): ReturnType<Rule> {
  return {
    check(node, reporter) {
      if (node.$type !== 'bpmn:UserTask') return
      const assigned =
        nonEmpty(readAttribute(node, 'flowable:assignee')) ||
        nonEmpty(readAttribute(node, 'flowable:candidateUsers')) ||
        nonEmpty(readAttribute(node, 'flowable:candidateGroups'))
      if (assigned) return
      reporter.report(
        node.id ?? '',
        'This user task has no assignee, candidate users or candidate groups, so nobody will ' +
          'see it in a work list.',
      )
    },
  }
}

export function formKeyResolvable(known: Set<string>): ReturnType<Rule> {
  return {
    check(node, reporter) {
      if (node.$type !== 'bpmn:UserTask' && node.$type !== 'bpmn:StartEvent') return
      const formKey = readAttribute(node, 'flowable:formKey')
      if (typeof formKey !== 'string' || formKey === '') return
      if (known.has(formKey)) return
      reporter.report(
        node.id ?? '',
        `No form "${formKey}" exists in this application or among the deployed forms. It may ` +
          'be deployed by another application later, but nothing resolves it today.',
      )
    },
  }
}

// ---- helpers ----

const ACTIVITY_TYPES = new Set([
  'bpmn:Task',
  'bpmn:UserTask',
  'bpmn:ServiceTask',
  'bpmn:SendTask',
  'bpmn:ReceiveTask',
  'bpmn:ManualTask',
  'bpmn:BusinessRuleTask',
  'bpmn:ScriptTask',
  'bpmn:CallActivity',
  'bpmn:SubProcess',
])

function isActivity(type: string): boolean {
  return ACTIVITY_TYPES.has(type)
}

export function toActivityType(bpmnType: string): string {
  return bpmnType
    .replace(/^bpmn:/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
}

export function readAttribute(node: Node, name: string): unknown {
  const direct = node.get?.(name)
  if (direct !== undefined) return direct
  // Attributes the moddle descriptor does not model land here and re-serialise verbatim.
  return node.$attrs?.[name]
}

function nonEmpty(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

/** Every `${identifier}` and bare identifier a delegate expression references. */
export function identifiersIn(expression: string): string[] {
  const matches = expression.matchAll(/\$\{\s*([A-Za-z_$][\w$]*)/g)
  const names = [...matches].map((match) => match[1]!)
  if (names.length > 0) return names
  const bare = /^[A-Za-z_$][\w$]*$/.exec(expression.trim())
  return bare ? [bare[0]] : []
}

function fieldNames(node: Node): Set<string> {
  const extensionElements = node.get?.('extensionElements') as
    { values?: { $type: string; name?: string }[] } | undefined
  const values = extensionElements?.values ?? []
  return new Set(
    values
      .filter((value) => value.$type === 'flowable:Field' && typeof value.name === 'string')
      .map((value) => value.name!),
  )
}
