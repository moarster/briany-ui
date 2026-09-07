import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n'
import { Button } from './Button'
import { IconButton } from './IconButton'

export function CopyButton({
  value,
  label = t('common.copy'),
  withLabel = false,
  size = 'sm',
}: {
  value: string
  label?: string
  withLabel?: boolean
  size?: 'sm' | 'md'
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => setCopied(true))
  }

  const icon = copied ? (
    <Check className="size-3.5 text-[var(--color-success)]" aria-hidden />
  ) : (
    <Copy className="size-3.5" aria-hidden />
  )

  if (withLabel) {
    return (
      <Button size={size} onClick={copy} icon={icon}>
        {copied ? t('common.copied') : label}
      </Button>
    )
  }
  return (
    <IconButton
      size={size}
      label={copied ? t('common.copied') : label}
      icon={icon}
      onClick={copy}
    />
  )
}
