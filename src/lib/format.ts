import { format, formatDistanceToNowStrict, intervalToDuration, isValid, parseISO } from 'date-fns'

/**
 * One implementation of "how long ago" and "how long", used by every cell in the product.
 * Absolute time lives in the tooltip; the cell itself is relative, because an operator
 * scanning a list is asking "recent or not", not "which minute".
 */

export function toDate(value: string | Date | undefined | null): Date | null {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? date : null
}

export function absolute(value: string | Date | undefined | null): string {
  const date = toDate(value)
  return date ? format(date, 'yyyy-MM-dd HH:mm:ss') : '-'
}

export function relative(value: string | Date | undefined | null): string {
  const date = toDate(value)
  if (!date) return '-'
  return `${formatDistanceToNowStrict(date)} ago`
}

/** Humanises a duration in milliseconds: `2d 4h`, `18m 3s`, `420ms`. */
export function duration(millis: number | undefined | null): string {
  if (millis === undefined || millis === null) return '-'
  if (millis < 1000) return `${millis}ms`

  const parts = intervalToDuration({ start: 0, end: millis })
  const segments: string[] = []
  if (parts.days) segments.push(`${parts.days}d`)
  if (parts.hours) segments.push(`${parts.hours}h`)
  if (parts.minutes) segments.push(`${parts.minutes}m`)
  if (parts.seconds && segments.length < 2) segments.push(`${parts.seconds}s`)
  // Two units is enough precision to compare rows and short enough to fit a cell.
  return segments.slice(0, 2).join(' ') || '0s'
}

/**
 * Truncates in the middle, keeping both ends legible. Ids and deployment hashes differ at
 * the tail as often as at the head, so cutting only the end hides the difference.
 */
export function truncateMiddle(value: string, keep = 8): string {
  if (value.length <= keep * 2 + 1) return value
  return `${value.slice(0, keep)}...${value.slice(-keep)}`
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
