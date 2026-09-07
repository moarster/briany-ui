import { Slot } from 'radix-ui'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] font-medium ' +
  'whitespace-nowrap select-none transition-[background-color,border-color,color,transform] ' +
  'duration-[var(--duration-1)] ease-[var(--ease-out)] active:translate-y-px ' +
  'disabled:pointer-events-none disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--text-on-primary)] border border-transparent ' +
    'hover:bg-[var(--color-primary-hover)]',
  secondary:
    'bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border-default)] ' +
    'hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] border border-transparent ' +
    'hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]',
  // Destructive actions are the only thing in the app that uses --color-danger.
  danger: 'bg-[var(--color-danger)] text-white border border-transparent ' + 'hover:brightness-110',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-[var(--control-height-sm)] px-2 text-xs',
  md: 'h-[var(--control-height-md)] px-3 text-sm',
  lg: 'h-[var(--control-height-lg)] px-4 text-sm',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  asChild?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  asChild = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const Component = asChild ? Slot.Root : 'button'
  return (
    <Component
      className={cx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : icon}
      {children}
    </Component>
  )
}
