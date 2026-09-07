import type { EngineCapabilities } from '../../../api'
import type { EditorProblem } from '../../shared/types'
import {
  allowedActivityType,
  delegateAllowlist,
  executableProcess,
  formKeyResolvable,
  httpTaskRequiredFields,
  noClassImplementation,
  noScriptTask,
  noShellTask,
  singleProcess,
  userTaskHasAssignment,
} from './rules'

type Node = {
  $type: string
  id?: string
  name?: string
  flowElements?: Node[]
  rootElements?: Node[]
  processRef?: Node
  get?: (name: string) => unknown
  $attrs?: Record<string, unknown>
}

type RuleDefinition = {
  name: string
  severity: 'error' | 'warning'
  rule: { check: (node: Node, reporter: { report: (id: string, message: string) => void }) => void }
}

export type LintContext = {
  capabilities: EngineCapabilities
  /** Form keys resolvable today: this application's `bform` files plus deployed forms. */
  knownFormKeys: Set<string>
}

/**
 * The Briany ruleset, assembled per lint run because most rules close over the engine
 * capabilities. Severity is fixed per rule, matching PROMPT 7.5.6.
 */
function ruleset({ capabilities, knownFormKeys }: LintContext): RuleDefinition[] {
  return [
    { name: 'executable-process', severity: 'error', rule: executableProcess() },
    { name: 'single-process', severity: 'error', rule: singleProcess() },
    { name: 'allowed-activity-type', severity: 'error', rule: allowedActivityType(capabilities) },
    { name: 'delegate-allowlist', severity: 'error', rule: delegateAllowlist(capabilities) },
    {
      name: 'no-class-implementation',
      severity: 'error',
      rule: noClassImplementation(capabilities),
    },
    // Constants, not capabilities: PROMPT 1.5 is a product rule.
    { name: 'no-script-task', severity: 'error', rule: noScriptTask() },
    { name: 'no-shell-task', severity: 'error', rule: noShellTask() },
    { name: 'http-task-required-fields', severity: 'error', rule: httpTaskRequiredFields() },
    { name: 'form-key-resolvable', severity: 'warning', rule: formKeyResolvable(knownFormKeys) },
    { name: 'user-task-has-assignment', severity: 'warning', rule: userTaskHasAssignment() },
  ]
}

/**
 * Runs the ruleset over a parsed moddle definitions tree. Kept free of bpmn-js and React
 * so it can be unit-tested against a fixture and reused by the round-trip suite.
 */
export function lint(definitions: Node, context: LintContext): EditorProblem[] {
  const rules = ruleset(context)
  const problems: EditorProblem[] = []
  const nodes = collect(definitions)

  for (const { name, severity, rule } of rules) {
    for (const node of nodes) {
      rule.check(node, {
        report: (id, message) => {
          const target = nodes.find((candidate) => candidate.id === id)
          problems.push({
            id: `${name}:${id}:${problems.length}`,
            severity,
            message,
            code: name,
            source: 'lint',
            elementId: id || undefined,
            elementName: target?.name,
          })
        },
      })
    }
  }

  return problems
}

/** Every element in the tree, flattened: processes, their flow elements, sub-processes. */
function collect(definitions: Node): Node[] {
  const nodes: Node[] = []

  const walk = (node: Node | undefined) => {
    if (!node) return
    nodes.push(node)
    for (const child of node.flowElements ?? []) walk(child)
    if (node.processRef) walk(node.processRef)
  }

  for (const root of definitions.rootElements ?? []) {
    if (root.$type === 'bpmn:Collaboration') {
      // Participants reference the processes; walking them reaches the same nodes once,
      // because a participant's processRef is not also in rootElements twice.
      for (const participant of (root.get?.('participants') as Node[] | undefined) ?? []) {
        walk(participant.processRef)
      }
      continue
    }
    walk(root)
  }

  return nodes
}

export { toActivityType, identifiersIn, readAttribute } from './rules'
