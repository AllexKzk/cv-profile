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
