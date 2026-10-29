import type { Cv } from './schema'

// Month index since year 0: '2024-10' → 2024 * 12 + 9
function toMonthIndex(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number) as [number, number]
  return year * 12 + month - 1
}

function currentMonthIndex(now: Date): number {
  return now.getFullYear() * 12 + now.getMonth()
}

// Inclusive: '2024-10'..'2024-12' is 3 months. `end: null` means "present"
export function monthsBetween(start: string, end: string | null, now: Date = new Date()): number {
  const from = toMonthIndex(start)
  const to = end === null ? currentMonthIndex(now) : toMonthIndex(end)
  return Math.max(0, to - from + 1)
}

// Union of all positions, so overlapping months are counted once
export function getTotalExperienceMonths(cv: Pick<Cv, 'experience'>, now: Date = new Date()): number {
  const intervals = cv.experience
    .map(({ start, end }) => [
      toMonthIndex(start),
      end === null ? currentMonthIndex(now) : toMonthIndex(end),
    ] as [number, number])
    .filter(([from, to]) => to >= from)
    .sort((a, b) => a[0] - b[0])

  let total = 0
  let current: [number, number] | null = null

  for (const [from, to] of intervals) {
    if (current && from <= current[1] + 1) {
      current[1] = Math.max(current[1], to)
      continue
    }
    if (current) total += current[1] - current[0] + 1
    current = [from, to]
  }
  if (current) total += current[1] - current[0] + 1

  return total
}

// Whole years of experience, rounded down: shown as "5+ years"
export function getExperienceYears(cv: Pick<Cv, 'experience'>, now: Date = new Date()): number {
  return Math.floor(getTotalExperienceMonths(cv, now) / 12)
}

// '2 years 3 months' / '2 года 3 месяца'. Intl picks the plural forms of the locale.
export function formatDuration(months: number, locale: string): string {
  const unit = (value: number, name: 'year' | 'month') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'long' }).format(value)

  const years = Math.floor(months / 12)
  const rest = months % 12
  const parts = [
    years > 0 ? unit(years, 'year') : '',
    rest > 0 || years === 0 ? unit(rest, 'month') : '',
  ].filter(Boolean)
  return new Intl.ListFormat(locale, { style: 'narrow', type: 'unit' }).format(parts)
}

// '2024-10' → 'Oct 2024' / 'окт. 2024 г.'
export function formatYearMonth(yearMonth: string, locale: string): string {
  const [year, month] = yearMonth.split('-').map(Number) as [number, number]
  // UTC on both sides, so the time zone of the runtime never shifts the month
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1)))
}
