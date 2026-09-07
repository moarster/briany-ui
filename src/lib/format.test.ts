import { describe, expect, it } from 'vitest'
import { duration, relative, toDate, truncateMiddle } from './format'

describe('duration', () => {
  it('shows milliseconds below a second, where seconds would read as zero', () => {
    expect(duration(420)).toBe('420ms')
  })

  it('shows at most two units, which is enough to compare two rows', () => {
    expect(duration(2 * 86_400_000 + 4 * 3_600_000 + 30 * 60_000)).toBe('2d 4h')
    expect(duration(18 * 60_000 + 3000)).toBe('18m 3s')
  })

  it('renders a missing duration as a dash rather than as zero', () => {
    expect(duration(undefined)).toBe('-')
    expect(duration(null)).toBe('-')
  })
})

describe('relative', () => {
  it('renders an instant in the past as an ago phrase', () => {
    const anHourAgo = new Date(Date.now() - 3_600_000).toISOString()
    expect(relative(anHourAgo)).toBe('1 hour ago')
  })

  it('renders a missing value as a dash', () => {
    expect(relative(undefined)).toBe('-')
  })
})

describe('toDate', () => {
  it('rejects an unparseable value rather than returning an Invalid Date', () => {
    expect(toDate('not a date')).toBeNull()
    expect(toDate(undefined)).toBeNull()
    expect(toDate('2026-04-07T09:30:00Z')).toBeInstanceOf(Date)
  })
})

describe('truncateMiddle', () => {
  it('leaves a short value alone', () => {
    expect(truncateMiddle('short', 8)).toBe('short')
  })

  it('keeps both ends, because ids differ at the tail as often as at the head', () => {
    expect(truncateMiddle('orderProcess:7:4a0716d3f9c2', 6)).toBe('orderP...d3f9c2')
  })
})
