import BpmnModeler from 'bpmn-js/lib/Modeler'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { EngineCapabilities } from '../../api'
import { Button, SeverityIcon } from '../../design/components'
import { EXCLUSION_RATIONALE, describeExcluded } from './constants'
import { useBpmnPalette, useEngineCapabilities } from './capabilities'
import { lint } from './lint'
import brianyModdle from './moddle/briany.json'
import flowableModdle from './moddle/flowable.json'
import {
  brianyContextPadModule,
  brianyPaletteModule,
  brianySingleParticipantModule,
} from './palette'
import { descriptorPropertiesProviderModule } from './properties/descriptor/DescriptorPropertiesProvider'
import { flowablePropertiesProviderModule } from './properties/FlowablePropertiesProvider'
import { brianyPropertiesPanelModule } from './properties/PropertiesPanelHost'
import { FormCombobox, useFormOptions } from './properties/FormCombobox'
import { extensionValues, hasAttributeFormFields, normaliseFields } from './properties/fields'
import { brianyRendererModule } from './renderer/HttpTaskRenderer'
import { service } from './services'
import type { EditorHandle, EditorProblem } from '../shared/types'
import { NewFileDialog } from '../../features/applications/NewFileDialog'
import '../../design/vendor/bpmn.css'

export type BpmnEditorProps = {
  initialContent: string
  appKey: string
  fileKey: string
  selectElement?: string
  onChange: (serialised: string) => void
  onProblems: (problems: EditorProblem[]) => void
  onReady: (handle: EditorHandle) => void
}

/**
 * The BPMN modeler. Every Briany capability is its own didi module - palette, context pad,
 * renderer, panel providers, the single-participant rule - so a new capability is a new
 * module rather than an edit spread across this component.
 */
export default function BpmnEditor({
  initialContent,
  appKey,
  fileKey,
  selectElement,
  onChange,
  onProblems,
  onReady,
}: BpmnEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const modelerRef = useRef<any>(null)
  const queryClient = useQueryClient()

  const { capabilities } = useEngineCapabilities()
  const { descriptors } = useBpmnPalette()
  const { knownKeys } = useFormOptions(appKey)

  const [selection, setSelection] = useState<any>(null)
  const [createFormFor, setCreateFormFor] = useState<string | null>(null)

  // Capabilities are read once at construction; a change to them re-creates the modeler,
  // which is correct - the palette and the lint ruleset both depend on them.
  const capabilitiesKey = useMemo(() => JSON.stringify(capabilities), [capabilities])

  useEffect(() => {
    const canvas = canvasRef.current
    const panel = panelRef.current
    if (!canvas || !panel) return

    const modeler = new BpmnModeler({
      container: canvas,
      propertiesPanel: { parent: panel },
      keyboard: { bindTo: document },
      additionalModules: [
        brianyPropertiesPanelModule,
        brianyPaletteModule,
        brianyContextPadModule,
        brianySingleParticipantModule,
        brianyRendererModule,
        flowablePropertiesProviderModule,
        descriptorPropertiesProviderModule,
        {
          // Values the Briany modules resolve from the injector, so no module reaches into
          // React state and no allowlist is hardcoded in one of them.
          brianyCapabilities: ['value', capabilities as EngineCapabilities],
          brianyDescriptors: ['value', descriptors],
        },
      ],
      moddleExtensions: { flowable: flowableModdle, briany: brianyModdle },
    })

    modelerRef.current = modeler

    const runLint = () => {
      const definitions = modeler.getDefinitions?.() ?? (modeler as any)._definitions
      if (!definitions) return
      onProblems(lint(definitions, { capabilities, knownFormKeys: knownKeys }))
    }

    const serialise = async (): Promise<string> => {
      const { xml } = await modeler.saveXML({ format: true })
      return xml ?? ''
    }

    // Dirty tracking compares serialised content, never change counts: bpmn-js fires
    // `changed` for pure viewport moves, which change nothing about the document.
    const onCommandStackChanged = () => {
      void serialise().then((xml) => {
        onChange(xml)
        runLint()
      })
    }

    modeler.on('commandStack.changed', onCommandStackChanged)
    modeler.on('selection.changed', (event: any) => {
      setSelection(event.newSelection.length === 1 ? event.newSelection[0] : null)
    })

    void modeler
      .importXML(initialContent)
      .then(({ warnings }: { warnings: unknown[] }) => {
        if (warnings.length > 0) {
          // Import is permissive: a foreign file opens, renders and round-trips, and its
          // problems are reported rather than silently corrected.
          console.warn('BPMN import warnings', warnings)
        }
        service(modeler, 'canvas').zoom('fit-viewport', 'auto')
        runLint()

        onReady({
          serialise,
          reveal: (elementId: string) => {
            const element = service(modeler, 'elementRegistry').get(elementId)
            if (!element) return
            service(modeler, 'selection').select(element)
            service(modeler, 'canvas').scrollToElement(element)
          },
        })

        if (selectElement) {
          const element = service(modeler, 'elementRegistry').get(selectElement)
          if (element) {
            service(modeler, 'selection').select(element)
            service(modeler, 'canvas').scrollToElement(element)
          }
        }
      })
      .catch((error: unknown) => {
        toast.error('This file could not be opened as BPMN.')
        console.error(error)
      })

    return () => {
      modeler.destroy()
      modelerRef.current = null
    }
    // `capabilitiesKey` stands in for the capabilities object, which is recreated per
    // render but is value-stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent, capabilitiesKey, descriptors])

  const businessObject = selection?.businessObject
  // `describeExcluded` returns the label as well as the verdict, so this component never
  // has to name an excluded element type itself. See constants.ts.
  const excludedLabel = businessObject === undefined ? null : describeExcluded(businessObject)
  const unsupported = excludedLabel !== null

  const showsFormBinding =
    businessObject !== undefined &&
    (businessObject.$type === 'bpmn:UserTask' || isNoneStartEvent(businessObject)) &&
    !unsupported

  const attributeFormFields =
    businessObject !== undefined && !unsupported && hasAttributeFormFields(businessObject)

  return (
    <div className="flex h-full min-h-0">
      <div ref={canvasRef} className="min-w-0 flex-1 bg-[var(--surface-inset)]" />

      <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-[var(--border-default)] bg-[var(--surface-1)]">
        {unsupported && (
          <UnsupportedNotice
            label={excludedLabel}
            onConvert={() => convertToPlainTask(modelerRef.current, selection)}
          />
        )}

        {attributeFormFields && (
          <AttributeFieldsNotice
            onNormalise={() => normaliseSelection(modelerRef.current, selection)}
          />
        )}

        {/* Rendered above the bpmn-io panel: these two need React Query, which a preact
            panel provider cannot reach. See FlowablePropertiesProvider's header comment. */}
        {showsFormBinding && (
          <div className="border-b border-[var(--border-default)] p-3">
            <FormCombobox
              appKey={appKey}
              value={(businessObject.get('flowable:formKey') as string | undefined) ?? ''}
              onChange={(value) =>
                updateAttribute(modelerRef.current, selection, 'flowable:formKey', value)
              }
              onCreateForm={(suggested) =>
                setCreateFormFor(suggested || suggestFormKey(businessObject, fileKey))
              }
            />
          </div>
        )}

        {businessObject?.$type === 'bpmn:BusinessRuleTask' && !unsupported && (
          <div className="border-b border-[var(--border-default)] p-3">
            <FormCombobox
              appKey={appKey}
              label="Decision key"
              value={
                (businessObject.get('flowable:decisionTableReferenceKey') as string | undefined) ??
                ''
              }
              onChange={(value) =>
                updateAttribute(
                  modelerRef.current,
                  selection,
                  'flowable:decisionTableReferenceKey',
                  value,
                )
              }
              onCreateForm={() => setCreateFormFor(suggestFormKey(businessObject, fileKey))}
            />
          </div>
        )}

        <div ref={panelRef} className="min-h-0 flex-1" />
      </aside>

      <NewFileDialog
        appKey={appKey}
        type="bform"
        open={createFormFor !== null}
        initialKey={createFormFor ?? ''}
        onOpenChange={(open) => !open && setCreateFormFor(null)}
        onCreated={(createdKey) => {
          // Create the file and bind it in one step - the action that makes this feel like
          // a modeler rather than a text field over a foreign key.
          updateAttribute(modelerRef.current, selection, 'flowable:formKey', createdKey)
          setCreateFormFor(null)
          void queryClient.invalidateQueries()
        }}
      />
    </div>
  )
}

function isNoneStartEvent(businessObject: any): boolean {
  if (businessObject.$type !== 'bpmn:StartEvent') return false
  const definitions = businessObject.get('eventDefinitions') as unknown[] | undefined
  return !definitions || definitions.length === 0
}

function suggestFormKey(businessObject: any, fileKey: string): string {
  const id = businessObject.get('id') as string | undefined
  return id ? `${id}Form` : `${fileKey}Form`
}

function updateAttribute(modeler: any, element: any, attribute: string, value: string) {
  if (!modeler || !element) return
  service(modeler, 'modeling').updateModdleProperties(element, element.businessObject, {
    [attribute]: value === '' ? undefined : value,
  })
}

function normaliseSelection(modeler: any, element: any) {
  if (!modeler || !element) return
  const modeling = service(modeler, 'modeling')
  const moddle = service(modeler, 'moddle')
  const businessObject = element.businessObject
  const extensionElements = businessObject.get('extensionElements')
  const values = extensionValues(businessObject)
  const fields = normaliseFields(moddle, businessObject)
  modeling.updateModdleProperties(element, extensionElements, {
    values: [...values.filter((value) => value.$type !== 'flowable:Field'), ...fields],
  })
  toast.success('Fields rewritten into the editable child-element form.')
}

/**
 * Converts an unsupported element to a plain `bpmn:Task`, giving the author a starting
 * point for rewriting it against a delegate, the HTTP task or a descriptor. The element is
 * never edited in place and never deleted silently.
 */
function convertToPlainTask(modeler: any, element: any) {
  if (!modeler || !element) return
  service(modeler, 'bpmnReplace').replaceElement(element, { type: 'bpmn:Task' })
  toast.success(
    'Replaced with a plain task. Wire it up with a delegate, an HTTP task or a descriptor.',
  )
}

function UnsupportedNotice({ label, onConvert }: { label: string; onConvert: () => void }) {
  return (
    <div className="border-b border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] p-3">
      <div className="flex items-start gap-2">
        <SeverityIcon severity="error" className="mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            Briany does not support this {label}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {EXCLUSION_RATIONALE} The model cannot be deployed until this element is replaced.
          </p>
          <Button size="sm" className="mt-2" onClick={onConvert}>
            Convert to a plain task
          </Button>
        </div>
      </div>
    </div>
  )
}

function AttributeFieldsNotice({ onNormalise }: { onNormalise: () => void }) {
  return (
    <div className="border-b border-[var(--color-warning-soft)] bg-[var(--color-warning-soft)] p-3">
      <div className="flex items-start gap-2">
        <SeverityIcon severity="warning" className="mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-primary)]">Attribute-form fields</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            This element has fields whose value is the <code>stringValue</code> attribute rather
            than a child element. They read correctly, but the editor writes the child form, so a
            value would move the first time it is edited. Rewrite them now instead.
          </p>
          <Button size="sm" className="mt-2" onClick={onNormalise}>
            Normalise fields
          </Button>
        </div>
      </div>
    </div>
  )
}
