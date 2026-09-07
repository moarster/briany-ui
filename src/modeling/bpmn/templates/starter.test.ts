import { BpmnModdle } from 'bpmn-moddle'
import { describe, expect, it } from 'vitest'
import brianyModdle from '../moddle/briany.json'
import flowableModdle from '../moddle/flowable.json'
import { bpmnStarter, dmnStarter, formStarter, starterFor, toUploadFile } from './starter'

/**
 * Every property of the BPMN starter is load-bearing, so each one is pinned here rather
 * than left to be discovered at deploy time.
 */
describe('bpmn starter', () => {
  it('marks the process executable, without which Flowable creates no definition', () => {
    expect(bpmnStarter('orders', 'Orders')).toContain('isExecutable="true"')
  })

  it('declares the flowable namespace even while unused, so the round-trip is stable', () => {
    expect(bpmnStarter('orders', 'Orders')).toContain('xmlns:flowable="http://flowable.org/bpmn"')
    expect(bpmnStarter('orders', 'Orders')).toContain('xmlns:briany="http://briany.ru/bpmn"')
  })

  it('defines exactly one process, which is what the introspector accepts', async () => {
    const moddle = new BpmnModdle({ flowable: flowableModdle, briany: brianyModdle })
    const { rootElement, warnings } = await moddle.fromXML(bpmnStarter('orders', 'Orders'))
    const processes = rootElement.rootElements.filter((root: any) => root.$type === 'bpmn:Process')

    expect(warnings).toEqual([])
    expect(processes).toHaveLength(1)
    expect(processes[0].id).toBe('orders')
  })

  it('carries BPMNDI for the start event, so bpmn-js has a plane to render into', () => {
    const xml = bpmnStarter('orders', 'Orders')
    expect(xml).toContain('<bpmndi:BPMNPlane id="BPMNPlane_orders" bpmnElement="orders">')
    expect(xml).toContain('bpmnElement="StartEvent_1"')
  })

  it('escapes the name, so a quote in it cannot break the document', async () => {
    const xml = bpmnStarter('orders', 'Ivan\'s "big" <orders> & co')
    const moddle = new BpmnModdle({ flowable: flowableModdle, briany: brianyModdle })
    const { rootElement, warnings } = await moddle.fromXML(xml)
    const process = rootElement.rootElements.find((root: any) => root.$type === 'bpmn:Process')

    expect(warnings).toEqual([])
    expect(process.name).toBe('Ivan\'s "big" <orders> & co')
  })
})

describe('form starter', () => {
  it('sets schema.id to the file key, because that is the form key by construction', () => {
    const schema = JSON.parse(formStarter('approveOrder', 'Approve order')) as { id: string }
    expect(schema.id).toBe('approveOrder')
  })

  it('produces a valid form-js schema shape', () => {
    const schema = JSON.parse(formStarter('approveOrder', 'Approve')) as {
      type: string
      components: unknown[]
      schemaVersion: number
    }
    expect(schema.type).toBe('default')
    expect(Array.isArray(schema.components)).toBe(true)
    expect(schema.schemaVersion).toBeGreaterThan(0)
  })
})

describe('dmn starter', () => {
  it('defines exactly one decision, whose id is the file key', () => {
    const xml = dmnStarter('creditScore', 'Credit score')
    expect(xml.match(/<decision\b/g)).toHaveLength(1)
    expect(xml).toContain('<decision id="creditScore"')
  })
})

describe('upload', () => {
  it('names the file with the extension the backend derives the type from', () => {
    expect(toUploadFile('bpmn', 'orders', '<x/>').name).toBe('orders.bpmn')
    expect(toUploadFile('dmn', 'score', '<x/>').name).toBe('score.dmn')
    expect(toUploadFile('bform', 'approve', '{}').name).toBe('approve.bform')
  })

  it('sends a form as JSON and a model as XML', () => {
    expect(toUploadFile('bform', 'approve', '{}').type).toBe('application/json')
    expect(toUploadFile('bpmn', 'orders', '<x/>').type).toBe('application/xml')
  })

  it('routes each type to its own starter', () => {
    expect(starterFor('bpmn', 'a', 'A')).toContain('<process id="a"')
    expect(starterFor('dmn', 'a', 'A')).toContain('<decision id="a"')
    expect(JSON.parse(starterFor('bform', 'a', 'A')).id).toBe('a')
  })
})
