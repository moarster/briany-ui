import { BpmnModdle } from 'bpmn-moddle'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lint } from './lint'
import brianyModdle from './moddle/briany.json'
import flowableModdle from './moddle/flowable.json'
import { createField, extensionValues, readFields } from './properties/fields'
import type { EngineCapabilities } from '../../api'

/**
 * The golden-file round-trip suite. For each fixture: import the XML, apply a scripted set
 * of panel edits, export, and assert against the expected result.
 *
 * This is the only reliable defence against a moddle change silently reshaping documents,
 * which is why the assertions are on the serialised XML rather than on the object graph.
 */

const capabilities: EngineCapabilities = {
  flowableVersion: '8.0.0',
  allowedActivityTypes: [
    'user_task',
    'service_task',
    'call_activity',
    'sub_process',
    'business_rule_task',
  ],
  allowedDelegateBeans: ['kvDelegate'],
  allowedClassPrefixes: ['ru.briany.', 'org.flowable.'],
  activityWhitelistEnabled: true,
  httpTaskEnabled: true,
}

function fixture(name: string): string {
  return readFileSync(join(__dirname, '__fixtures__', name), 'utf8')
}

function moddle() {
  return new BpmnModdle({ flowable: flowableModdle, briany: brianyModdle })
}

async function roundTrip(xml: string) {
  const instance = moddle()
  const { rootElement, warnings } = await instance.fromXML(xml)
  const { xml: out } = await instance.toXML(rootElement, { format: true })
  return { instance, definitions: rootElement, out: out as string, warnings }
}

function elementById(definitions: any, id: string): any {
  const process = definitions.rootElements.find((root: any) => root.$type === 'bpmn:Process')
  const find = (nodes: any[]): any => {
    for (const node of nodes) {
      if (node.id === id) return node
      const found = node.flowElements ? find(node.flowElements) : undefined
      if (found) return found
    }
    return undefined
  }
  return find(process.flowElements)
}

describe('flowable-fields fixture', () => {
  it('imports without warnings and preserves every field value', async () => {
    const { definitions, warnings } = await roundTrip(fixture('flowable-fields.bpmn'))
    expect(warnings).toEqual([])

    const task = elementById(definitions, 'Task_1')
    expect(readFields(task)).toEqual([
      { name: 'childString', value: 'literal', isExpression: false },
      { name: 'childExpression', value: '${orderId}', isExpression: true },
      { name: 'attrString', value: 'from-attribute', isExpression: false },
    ])
    expect(task.get('flowable:delegateExpression')).toBe('${kvDelegate}')
  })

  it('re-serialises unchanged when nothing is edited', async () => {
    const first = await roundTrip(fixture('flowable-fields.bpmn'))
    const second = await roundTrip(first.out)
    // Stability across two passes is what actually matters: the first pass may normalise
    // attribute order, but a document must not keep drifting on every save.
    expect(second.out).toBe(first.out)
  })

  it('writes an added field in the child-element form', async () => {
    const { instance, definitions } = await roundTrip(fixture('flowable-fields.bpmn'))
    const task = elementById(definitions, 'Task_1')
    const added = createField(instance as never, {
      name: 'namespace',
      value: 'orders',
      isExpression: false,
    })
    task.get('extensionElements').set('values', [...extensionValues(task), added])

    const { xml } = await instance.toXML(definitions, { format: true })
    expect(xml).toContain('<flowable:field name="namespace">')
    expect(xml).toContain('<flowable:string>orders</flowable:string>')
    expect(xml).not.toContain('stringValue="orders"')
  })
})

describe('unsupported-tasks fixture', () => {
  it('round-trips a script task and a shell task without loss', async () => {
    const source = fixture('unsupported-tasks.bpmn')
    const { definitions, out, warnings } = await roundTrip(source)

    // Our descriptor deliberately does not model script-task attributes, so moddle warns
    // about them. The warning is the point: it is how an unmodelled attribute announces
    // that it is being carried in $attrs rather than understood.
    expect(warnings.map((warning: { property?: string }) => warning.property)).toEqual([
      'flowable:autoStoreVariables',
    ])

    // Import is permissive: the elements open, render and survive a save unchanged.
    expect(out).toContain('<scriptTask')
    expect(out).toContain('scriptFormat="groovy"')
    // An attribute our descriptor does not model still re-serialises verbatim.
    expect(out).toContain('flowable:autoStoreVariables="false"')
    expect(out).toContain("execution.setVariable('a', 1)")
    expect(out).toContain('flowable:type="shell"')

    const script = elementById(definitions, 'Script_1')
    expect(script.$type).toBe('bpmn:ScriptTask')
  })

  it('is stable across a second pass', async () => {
    const first = await roundTrip(fixture('unsupported-tasks.bpmn'))
    const second = await roundTrip(first.out)
    expect(second.out).toBe(first.out)
  })

  it('raises no-script-task and no-shell-task as errors', async () => {
    const { definitions } = await roundTrip(fixture('unsupported-tasks.bpmn'))
    const problems = lint(definitions, { capabilities, knownFormKeys: new Set() })
    const codes = problems
      .filter((problem) => problem.severity === 'error')
      .map((problem) => problem.code)

    expect(codes).toContain('no-script-task')
    expect(codes).toContain('no-shell-task')

    const scriptProblem = problems.find((problem) => problem.code === 'no-script-task')
    // The message must read as a product decision, not a configuration complaint.
    expect(scriptProblem?.message).toMatch(/not supported by Briany/)
    expect(scriptProblem?.message).toMatch(/delegate|HTTP task|element descriptor/)
    expect(scriptProblem?.elementId).toBe('Script_1')
  })
})

describe('http-task fixture', () => {
  it('preserves the briany descriptor annotation, which pins the descriptor version', async () => {
    const { definitions, out } = await roundTrip(fixture('http-task.bpmn'))
    const task = elementById(definitions, 'Http_1')

    expect(task.get('briany:descriptorId')).toBe('kv-task')
    expect(task.get('briany:descriptorVersion')).toBe(1)
    expect(out).toContain('briany:descriptorId="kv-task"')
    expect(out).toContain('briany:descriptorVersion="1"')
  })

  it('passes lint when the HTTP task carries its required fields', async () => {
    const { definitions } = await roundTrip(fixture('http-task.bpmn'))
    const problems = lint(definitions, {
      capabilities,
      knownFormKeys: new Set(['approveForm']),
    })
    expect(problems.filter((problem) => problem.severity === 'error')).toEqual([])
  })

  it('reports a missing requestUrl on an HTTP task', async () => {
    const { instance, definitions } = await roundTrip(fixture('http-task.bpmn'))
    const task = elementById(definitions, 'Http_1')
    const remaining = extensionValues(task).filter((value) => value.get('name') !== 'requestUrl')
    task.get('extensionElements').set('values', remaining)
    void instance

    const problems = lint(definitions, { capabilities, knownFormKeys: new Set(['approveForm']) })
    expect(problems.map((problem) => problem.message)).toContainEqual(
      expect.stringContaining('no requestUrl'),
    )
  })

  it('warns about a form key that resolves to nothing', async () => {
    const { definitions } = await roundTrip(fixture('http-task.bpmn'))
    const problems = lint(definitions, { capabilities, knownFormKeys: new Set() })
    const warning = problems.find((problem) => problem.code === 'form-key-resolvable')

    expect(warning?.severity).toBe('warning')
    expect(warning?.message).toMatch(/approveForm/)
  })
})

describe('engine rules mirrored from the deployment validator', () => {
  it('rejects a delegate outside the allowlist', async () => {
    const xml = fixture('flowable-fields.bpmn').replace('${kvDelegate}', '${rogueDelegate}')
    const { definitions } = await roundTrip(xml)
    const problems = lint(definitions, { capabilities, knownFormKeys: new Set() })

    expect(problems.map((problem) => problem.code)).toContain('delegate-allowlist')
  })

  it('rejects a non-executable process, which would deploy and then not exist', async () => {
    const xml = fixture('flowable-fields.bpmn').replace(
      'isExecutable="true"',
      'isExecutable="false"',
    )
    const { definitions } = await roundTrip(xml)
    const problems = lint(definitions, { capabilities, knownFormKeys: new Set() })

    expect(problems.map((problem) => problem.code)).toContain('executable-process')
  })

  it('rejects a class outside the allowed prefixes', async () => {
    const xml = fixture('flowable-fields.bpmn').replace(
      'flowable:delegateExpression="${kvDelegate}"',
      'flowable:class="com.example.Rogue"',
    )
    const { definitions } = await roundTrip(xml)
    const problems = lint(definitions, { capabilities, knownFormKeys: new Set() })

    expect(problems.map((problem) => problem.code)).toContain('no-class-implementation')
  })
})
