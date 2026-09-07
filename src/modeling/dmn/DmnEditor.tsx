import DmnModeler from 'dmn-js/lib/Modeler'
import { DmnPropertiesPanelModule, DmnPropertiesProviderModule } from 'dmn-js-properties-panel'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { EditorHandle, EditorProblem } from '../shared/types'
import '../../design/vendor/dmn.css'

export type DmnEditorProps = {
  initialContent: string
  appKey: string
  fileKey: string
  selectElement?: string
  onChange: (serialised: string) => void
  onProblems: (problems: EditorProblem[]) => void
  onReady: (handle: EditorHandle) => void
}

/**
 * The DMN editor. Standard, per the brief: dmn-js with its properties panel, both the DRD
 * and the decision-table views, restyled through our tokens.
 *
 * One `<decision>` per file, mirroring the BPMN single-process rule and what
 * `ModelerFileIntrospector` accepts. The decision id is the `fileKey`, with the same
 * immutability handling the BPMN editor has.
 */
export default function DmnEditor({
  initialContent,
  fileKey,
  onChange,
  onProblems,
  onReady,
}: DmnEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const panel = panelRef.current
    if (!container || !panel) return

    const modeler = new DmnModeler({
      container,
      drd: {
        propertiesPanel: { parent: panel },
        additionalModules: [DmnPropertiesPanelModule, DmnPropertiesProviderModule],
      },
    })

    const serialise = async (): Promise<string> => {
      const { xml } = await modeler.saveXML({ format: true })
      return xml ?? ''
    }

    const check = () => {
      void serialise().then((xml) => onProblems(validate(xml, fileKey)))
    }

    void modeler
      .importXML(initialContent)
      .then(() => {
        check()
        onReady({ serialise })
      })
      .catch((error: unknown) => {
        toast.error('This file could not be opened as DMN.')
        console.error(error)
      })

    // dmn-js dispatches changes per active view, so the listener is attached to the
    // modeler's own event bus rather than to one view's.
    const onViewsChanged = () => {
      const activeViewer = modeler.getActiveViewer?.()
      activeViewer?.on?.('commandStack.changed', () => {
        void serialise().then((xml) => {
          onChange(xml)
          onProblems(validate(xml, fileKey))
        })
      })
    }

    modeler.on('views.changed', onViewsChanged)
    modeler.on('view.contentChanged', () => {
      void serialise().then((xml) => {
        onChange(xml)
        onProblems(validate(xml, fileKey))
      })
    })

    return () => {
      modeler.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent, fileKey])

  return (
    <div className="flex h-full min-h-0">
      <div ref={containerRef} className="min-w-0 flex-1 bg-[var(--surface-inset)]" />
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-[var(--border-default)] bg-[var(--surface-1)]">
        <div ref={panelRef} className="min-h-0" />
      </aside>
    </div>
  )
}

function validate(xml: string, fileKey: string): EditorProblem[] {
  const problems: EditorProblem[] = []

  const decisions = [...xml.matchAll(/<(?:[\w.-]+:)?decision\b[^>]*\bid="([^"]+)"/g)].map(
    (match) => match[1]!,
  )

  if (decisions.length === 0) {
    problems.push({
      id: 'dmn-no-decision',
      severity: 'error',
      source: 'lint',
      code: 'single-decision',
      message: 'This file defines no decision, so there is nothing for the engine to deploy.',
    })
  }

  if (decisions.length > 1) {
    problems.push({
      id: 'dmn-many-decisions',
      severity: 'error',
      source: 'lint',
      code: 'single-decision',
      message:
        `This file defines ${decisions.length} decisions. Briany stores exactly one decision ` +
        'per file, so it cannot be saved or deployed until the extra ones are removed.',
    })
  }

  if (decisions.length === 1 && decisions[0] !== fileKey) {
    problems.push({
      id: 'dmn-id-mismatch',
      severity: 'error',
      source: 'lint',
      code: 'decision-id',
      elementId: decisions[0],
      message:
        `The decision id is "${decisions[0]}" but this file is stored under "${fileKey}". ` +
        'The id is the decision key, so saving in place will be rejected.',
    })
  }

  return problems
}
