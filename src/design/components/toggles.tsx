import {
  Checkbox as RadixCheckbox,
  RadioGroup as RadixRadioGroup,
  Switch as RadixSwitch,
} from 'radix-ui'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  id,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: ReactNode
  disabled?: boolean
  id?: string
}) {
  const control = (
    <RadixCheckbox.Root
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(next) => onCheckedChange(next === true)}
      className={cx(
        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
        'border-[var(--border-strong)] bg-[var(--surface-inset)]',
        'data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:bg-[var(--color-primary)]',
        'disabled:opacity-50',
      )}
    >
      <RadixCheckbox.Indicator>
        <Check className="size-3 text-[var(--text-on-primary)]" aria-hidden strokeWidth={3} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  )
  if (!label) return control
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-secondary)]">
      {control}
      {label}
    </label>
  )
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  id,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: ReactNode
  id?: string
}) {
  const control = (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cx(
        'relative h-5 w-9 shrink-0 rounded-[var(--radius-full)] border border-[var(--border-default)]',
        'bg-[var(--surface-3)] transition-colors duration-[var(--duration-1)]',
        'data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:bg-[var(--color-primary)]',
      )}
    >
      <RadixSwitch.Thumb
        className={cx(
          'block size-3.5 translate-x-0.5 rounded-[var(--radius-full)] bg-[var(--text-primary)]',
          'transition-transform duration-[var(--duration-1)] ease-[var(--ease-out)]',
          'data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-[var(--text-on-primary)]',
        )}
      />
    </RadixSwitch.Root>
  )
  if (!label) return control
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-xs text-[var(--text-secondary)]">
      {control}
      {label}
    </label>
  )
}

export function RadioGroup<T extends string>({
  value,
  onValueChange,
  options,
  className,
}: {
  value: T
  onValueChange: (value: T) => void
  options: { value: T; label: string; hint?: string }[]
  className?: string
}) {
  return (
    <RadixRadioGroup.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      className={cx('flex flex-col gap-2', className)}
    >
      {options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-start gap-2 text-xs">
          <RadixRadioGroup.Item
            value={option.value}
            className={cx(
              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-full)] border',
              'border-[var(--border-strong)] bg-[var(--surface-inset)]',
              'data-[state=checked]:border-[var(--color-primary)]',
            )}
          >
            <RadixRadioGroup.Indicator className="size-2 rounded-[var(--radius-full)] bg-[var(--color-primary)]" />
          </RadixRadioGroup.Item>
          <span>
            <span className="text-[var(--text-primary)]">{option.label}</span>
            {option.hint && (
              <span className="mt-0.5 block text-[var(--text-muted)]">{option.hint}</span>
            )}
          </span>
        </label>
      ))}
    </RadixRadioGroup.Root>
  )
}
