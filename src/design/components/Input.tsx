import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

const field =
  'w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-inset)] ' +
  'px-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] ' +
  'transition-colors duration-[var(--duration-1)] ' +
  'hover:border-[var(--border-strong)] focus:border-[var(--color-primary)] ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-[invalid=true]:border-[var(--color-danger)]'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, mono = false, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(
        field,
        'h-[var(--control-height-md)]',
        mono && 'font-[family-name:var(--font-mono)]',
        className,
      )}
      {...rest}
    />
  )
})

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, mono = false, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cx(
        field,
        'py-1.5 leading-[var(--leading-body)] resize-y',
        mono && 'font-[family-name:var(--font-mono)]',
        className,
      )}
      {...rest}
    />
  )
})

export type FieldProps = {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

/** Label, control, and the one place a field-level `Problem.errors` entry is rendered. */
export function Field({ label, htmlFor, hint, error, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
        {required && (
          <span className="ml-0.5 text-[var(--color-danger)]" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[var(--color-danger)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}
