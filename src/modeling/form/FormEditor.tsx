// The viewer class is exported as `Form`; aliased for readability at the call sites.
import { FormEditor as BpmnFormEditor, Form as FormViewer } from '@bpmn-io/form-js'
import { Eye, Pencil } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { FormComponentType } from '../../api'
import { cx } from '../../lib/cx'
import type { EditorHandle, EditorProblem } from '../shared/types'
import '../../design/vendor/form.css'

export type FormEditorProps = {
  initialContent: string
  appKey: string
  fileKey: string
  onChange: (serialised: string) => void
  onProblems: (problems: EditorProblem[]) => void
  onReady: (handle: EditorHandle) => void
}

/**
 * The `.bform` editor. Deliberately simple, per the brief: form-js's own layout, restyled
 * through our tokens.
 *
 * `schema.id` is the form key and must equal the `fileKey`, so it is not edited here - a
 * rename goes through the host's "Save as a new file" path.
 */
export default function FormEditor({
  initialContent,
  fileKey,
  onChange,
  onProblems,
  onReady,
}: FormEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<any>(null)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const container = editorRef.current
    if (!container) return

    const editor = new BpmnFormEditor({ container })
    instanceRef.current = editor

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(initialContent) as Record<string, unknown>
    } catch {
      toast.error('This file is not valid JSON, so it cannot be opened as a form.')
      onProblems([
        {
          id: 'form-parse',
          severity: 'error',
          source: 'lint',
          message: 'The file is not valid JSON. Fix it outside the editor, or replace the file.',
        },
      ])
      return
    }

    void editor.importSchema(parsed).then(() => {
      setSchema(editor.getSchema() as Record<string, unknown>)
      onProblems(validate(editor.getSchema() as FormSchema, fileKey))
      onReady({
        serialise: async () => `${JSON.stringify(editor.getSchema(), null, 2)}\n`,
      })
    })

    editor.on('changed', () => {
      const next = editor.getSchema() as FormSchema
      setSchema(next as Record<string, unknown>)
      onChange(`${JSON.stringify(next, null, 2)}\n`)
      onProblems(validate(next, fileKey))
    })

    return () => {
      editor.destroy()
      instanceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent, fileKey])

  // The preview renders the same schema in a FormViewer with sample data, so the author
  // sees what the task performer will see. This is the difference between a form editor
  // and a JSON editor.
  useEffect(() => {
    const container = previewRef.current
    if (mode !== 'preview' || !container || !schema) return

    const viewer = new FormViewer({ container })
    void viewer.importSchema(schema, sampleData(schema as FormSchema))
    return () => viewer.destroy()
  }, [mode, schema])

  const variables = useMemo(() => (schema ? boundVariables(schema as FormSchema) : []), [schema])

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-default)] px-3 py-1.5">
          <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-muted)]">
            {fileKey}
          </p>
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] p-0.5">
            {(['edit', 'preview'] as const).map((candidate) => (
              <button
                key={candidate}
                type="button"
                aria-pressed={mode === candidate}
                onClick={() => setMode(candidate)}
                className={cx(
                  'flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-2xs transition-colors',
                  mode === candidate
                    ? 'bg-[var(--surface-3)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
              >
                {candidate === 'edit' ? (
                  <Pencil className="size-3" aria-hidden />
                ) : (
                  <Eye className="size-3" aria-hidden />
                )}
                {candidate === 'edit' ? 'Edit' : 'Preview'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div ref={editorRef} className={cx('h-full', mode !== 'edit' && 'hidden')} />
          {mode === 'preview' && (
            <div className="h-full overflow-auto bg-[var(--surface-1)] p-6">
              <div ref={previewRef} className="mx-auto max-w-xl" />
            </div>
          )}
        </div>
      </div>

      {/* The variables the schema binds, so the author can cross-check them against the
          process variables the BPMN model uses. */}
      <aside className="w-56 shrink-0 overflow-y-auto border-l border-[var(--border-default)] bg-[var(--surface-1)] p-3">
        <h3 className="mb-2 text-2xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Bound variables
        </h3>
        {variables.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            This form binds no variables yet. Add an input component and give it a key.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {variables.map((variable) => (
              <li
                key={variable}
                className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-secondary)]"
              >
                {variable}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}

type FormComponent = {
  id?: string
  key?: string
  type?: string
  label?: string
  components?: FormComponent[]
}

type FormSchema = { id?: string; components?: FormComponent[] }

/**
 * The contract's `FormComponentType` enum is the source of truth for which components are
 * allowed. Anything form-js offers that the enum omits is flagged, so a form cannot be
 * built out of components the backend will not accept.
 */
const ALLOWED_COMPONENT_TYPES = new Set<FormComponentType>([
  'textfield',
  'textarea',
  'number',
  'select',
  'radio',
  'checklist',
  'checkbox',
  'date',
  'datetime',
  'duration',
  'group',
  'dynamiclist',
  'juel',
  'expression',
  'iframe',
  'image',
  'filepicker',
  'separator',
  'spacer',
  'table',
  'time',
  'html',
  'button',
  'documentPreview',
  'taglist',
])

function validate(schema: FormSchema, fileKey: string): EditorProblem[] {
  const problems: EditorProblem[] = []

  if (schema.id !== fileKey) {
    problems.push({
      id: 'form-id-mismatch',
      severity: 'error',
      source: 'lint',
      code: 'form-id',
      message:
        `The schema id is "${schema.id ?? ''}" but this file is stored under "${fileKey}". ` +
        'The id is the form key, so saving in place will be rejected.',
    })
  }

  for (const component of flatten(schema.components ?? [])) {
    if (component.type && !ALLOWED_COMPONENT_TYPES.has(component.type as FormComponentType)) {
      problems.push({
        id: `form-type-${component.id ?? component.key ?? component.type}`,
        severity: 'error',
        source: 'lint',
        code: 'component-type',
        elementId: component.id,
        elementName: component.label,
        message: `The component type "${component.type}" is not part of the platform's form contract.`,
      })
    }
  }

  return problems
}

function flatten(components: FormComponent[]): FormComponent[] {
  return components.flatMap((component) => [component, ...flatten(component.components ?? [])])
}

/** The same extraction `FormVariableExtractor` performs server-side. */
function boundVariables(schema: FormSchema): string[] {
  const keys = flatten(schema.components ?? [])
    .map((component) => component.key)
    .filter((key): key is string => typeof key === 'string' && key !== '')
  return [...new Set(keys)].sort()
}

/** Placeholder values, so the preview shows a populated form rather than an empty one. */
function sampleData(schema: FormSchema): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const component of flatten(schema.components ?? [])) {
    if (!component.key) continue
    switch (component.type) {
      case 'checkbox':
        data[component.key] = false
        break
      case 'number':
        data[component.key] = 0
        break
      case 'checklist':
      case 'taglist':
        data[component.key] = []
        break
      default:
        data[component.key] = ''
    }
  }
  return data
}
