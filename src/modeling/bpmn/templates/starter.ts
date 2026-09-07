/**
 * The starter BPMN a New file dialog uploads. Every property of it is load-bearing:
 *
 * 1. `isExecutable="true"` - Flowable creates no process definition for a non-executable
 *    process, so the file would deploy and then not exist.
 * 2. The `flowable` namespace is declared even while unused, so the moddle round-trip is
 *    stable and the first `flowable:` attribute does not reshuffle the document.
 * 3. Exactly one `<process>` - `ModelerFileIntrospector` rejects zero or many.
 * 4. BPMNDI for every shape - bpmn-js needs a plane to render into.
 * 5. Ids are XML NCNames, which is what the New file dialog validates.
 */
export function bpmnStarter(key: string, name: string): string {
  const safeName = escapeXml(name || key)
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:flowable="http://flowable.org/bpmn"
             xmlns:briany="http://briany.ru/bpmn"
             typeLanguage="http://www.w3.org/2001/XMLSchema"
             expressionLanguage="http://www.w3.org/1999/XPath"
             targetNamespace="http://briany.ru/processdef"
             id="Definitions_${key}">
  <process id="${key}" name="${safeName}" isExecutable="true">
    <documentation></documentation>
    <startEvent id="StartEvent_1" name="Start" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_${key}">
    <bpmndi:BPMNPlane id="BPMNPlane_${key}" bpmnElement="${key}">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
`
}

/**
 * A `.bform` file is a form-js schema. `schema.id` is the form key and must equal the
 * `fileKey`, which is why the dialog sets it and the editor treats it as read-only.
 */
export function formStarter(key: string, name: string): string {
  return `${JSON.stringify(
    {
      $schema: 'https://unpkg.com/@bpmn-io/form-js@1/dist/assets/form-json-schema/index.json',
      id: key,
      type: 'default',
      schemaVersion: 18,
      components: [
        {
          id: `Text_${key}`,
          type: 'text',
          text: `# ${name || key}`,
        },
      ],
    },
    null,
    2,
  )}\n`
}

/**
 * One `<decision>` per file, mirroring the single-process rule. The decision id is the
 * `fileKey`, with the same immutability handling as BPMN.
 */
export function dmnStarter(key: string, name: string): string {
  const safeName = escapeXml(name || key)
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
             xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"
             xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"
             id="Definitions_${key}"
             name="${safeName}"
             namespace="http://briany.ru/dmn"
             exporter="Briany"
             exporterVersion="1.0">
  <decision id="${key}" name="${safeName}">
    <decisionTable id="DecisionTable_${key}" hitPolicy="FIRST">
      <input id="Input_1" label="Input">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="Output_1" label="Output" name="result" typeRef="string" />
      <rule id="Rule_1">
        <inputEntry id="InputEntry_1"><text></text></inputEntry>
        <outputEntry id="OutputEntry_1"><text></text></outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram id="DMNDiagram_${key}">
      <dmndi:DMNShape id="DMNShape_${key}" dmnElementRef="${key}">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>
`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const FILE_EXTENSION = { bpmn: '.bpmn', dmn: '.dmn', bform: '.bform' } as const

export const FILE_MIME = {
  bpmn: 'application/xml',
  dmn: 'application/xml',
  bform: 'application/json',
} as const

export function starterFor(type: 'bpmn' | 'dmn' | 'bform', key: string, name: string): string {
  if (type === 'bpmn') return bpmnStarter(key, name)
  if (type === 'dmn') return dmnStarter(key, name)
  return formStarter(key, name)
}

/** The multipart body the upsert and update endpoints take. */
export function toUploadFile(
  type: 'bpmn' | 'dmn' | 'bform',
  fileKey: string,
  content: string,
): File {
  return new File([content], `${fileKey}${FILE_EXTENSION[type]}`, { type: FILE_MIME[type] })
}
