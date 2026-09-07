import { Select as Radix } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { cx } from '../../lib/cx'

export type SelectOption<T extends string = string> = {
  value: T
  label: string
  disabled?: boolean
}

export function Select<T extends string = string>({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
}: {
  value: T | undefined
  onValueChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}) {
  return (
    <Radix.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      disabled={disabled}
    >
      <Radix.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cx(
          'inline-flex h-[var(--control-height-md)] w-full items-center justify-between gap-2',
          'rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-inset)] px-2',
          'text-sm text-[var(--text-primary)] hover:border-[var(--border-strong)]',
          'data-[placeholder]:text-[var(--text-muted)] disabled:opacity-60',
          className,
        )}
      >
        <Radix.Value placeholder={placeholder} />
        <ChevronDown className="size-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
      </Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          position="popper"
          sideOffset={4}
          className="glass z-[var(--z-overlay)] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-md)] p-1 shadow-[var(--shadow-2)]"
        >
          <Radix.Viewport>
            {options.map((option) => (
              <Radix.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cx(
                  'flex cursor-default select-none items-center justify-between gap-2 rounded-[var(--radius-sm)]',
                  'px-2 py-1.5 text-xs text-[var(--text-secondary)] outline-none',
                  'data-[highlighted]:bg-[var(--surface-3)] data-[highlighted]:text-[var(--text-primary)]',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
                )}
              >
                <Radix.ItemText>{option.label}</Radix.ItemText>
                <Radix.ItemIndicator>
                  <Check className="size-3.5 text-[var(--color-primary)]" aria-hidden />
                </Radix.ItemIndicator>
              </Radix.Item>
            ))}
          </Radix.Viewport>
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  )
}
