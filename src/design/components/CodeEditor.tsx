import { markdown } from '@codemirror/lang-markdown'
import { xml } from '@codemirror/lang-xml'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useMemo } from 'react'
import { useTheme } from '../../lib/theme'

/**
 * CodeMirror is used for exactly two things: editing the application README, and reading
 * deployed XML. It is deliberately not a process-logic editor - Briany never executes
 * code supplied through a model (see PROMPT 1.5).
 */
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  height = '100%',
  ariaLabel,
}: {
  value: string
  onChange?: (value: string) => void
  language: 'markdown' | 'xml'
  readOnly?: boolean
  height?: string
  ariaLabel?: string
}) {
  const { resolved } = useTheme()

  const extensions = useMemo(
    () => [language === 'markdown' ? markdown() : xml(), EditorView.lineWrapping],
    [language],
  )

  return (
    <CodeMirror
      value={value}
      height={height}
      readOnly={readOnly}
      editable={!readOnly}
      theme={resolved === 'dark' ? 'dark' : 'light'}
      extensions={extensions}
      onChange={onChange}
      aria-label={ariaLabel}
      basicSetup={{
        lineNumbers: true,
        foldGutter: language === 'xml',
        highlightActiveLine: !readOnly,
        autocompletion: false,
      }}
      className="h-full text-xs [&_.cm-editor]:h-full [&_.cm-editor]:bg-[var(--surface-inset)] [&_.cm-gutters]:border-none [&_.cm-gutters]:bg-transparent"
    />
  )
}
