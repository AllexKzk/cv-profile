import { describe, expect, it } from 'vitest'
import { buildCv, formatDuration, formatYearMonth, getCv, getExperienceYears, getTotalExperienceMonths, LOCALES, monthsBetween } from '../../shared/cv'
import { common } from '../../shared/cv/data/common'
import { en } from '../../shared/cv/data/en'

describe('getCv', () => {
  it.each(LOCALES)('returns a valid CV for "%s"', (locale) => {
    const cv = getCv(locale)

    expect(cv.locale).toBe(locale)
    expect(cv.experience).toHaveLength(common.experience.length)
    expect(cv.skills).toHaveLength(common.skills.length)
    expect(cv.experience.every(item => item.role && item.highlights.length > 0)).toBe(true)
  })

  it('keeps language-independent facts identical across locales', () => {
    const [enCv, ruCv] = LOCALES.map(getCv) as [ReturnType<typeof getCv>, ReturnType<typeof getCv>]
    const facts = (cv: typeof enCv) => cv.experience.map(({ id, start, end, stack }) => ({ id, start, end, stack }))

    expect(facts(ruCv)).toEqual(facts(enCv))
    expect(ruCv.contacts).toEqual(enCv.contacts)
  })
})

describe('buildCv', () => {
  it('fails with the field path on invalid data', () => {
    const broken = {
      ...common,
      experience: [{ ...common.experience[0]!, start: '2024-13' }, ...common.experience.slice(1)],
    }

    expect(() => buildCv('en', broken, en)).toThrow(/data\/common\.ts[\s\S]*Expected YYYY-MM[\s\S]*experience\[0\]\.start/)
  })

  it('fails when texts are missing for an experience id', () => {
    const { 'cyno-one': _removed, ...rest } = en.experience

    expect(() => buildCv('en', common, { ...en, experience: rest })).toThrow(/missing \[cyno-one\]/)
  })

  it('fails when texts have an unknown skill group', () => {
    const texts = { ...en, skillGroups: { ...en.skillGroups, extra: 'Extra' } }

    expect(() => buildCv('en', common, texts)).toThrow(/unknown \[extra\]/)
  })
})

describe('monthsBetween', () => {
  const now = new Date(2026, 9, 15) // October 2026

  it('counts the same month as 1', () => {
    expect(monthsBetween('2024-10', '2024-10')).toBe(1)
  })

  it('counts inclusively across a year boundary', () => {
    expect(monthsBetween('2024-11', '2025-02')).toBe(4)
  })

  it('treats null end as the current month', () => {
    expect(monthsBetween('2026-01', null, now)).toBe(10)
  })
})

describe('getTotalExperienceMonths', () => {
  const now = new Date(2026, 9, 15) // October 2026

  it('counts overlapping positions once', () => {
    const cv = {
      experience: [
        { start: '2024-01', end: '2024-06' },
        { start: '2024-06', end: '2024-12' },
      ],
    } as Parameters<typeof getTotalExperienceMonths>[0]

    expect(getTotalExperienceMonths(cv, now)).toBe(12)
  })

  it('does not count gaps', () => {
    const cv = {
      experience: [
        { start: '2020-01', end: '2020-03' },
        { start: '2021-01', end: '2021-02' },
      ],
    } as Parameters<typeof getTotalExperienceMonths>[0]

    expect(getTotalExperienceMonths(cv, now)).toBe(5)
  })

  it('gives 5+ years for the real CV', () => {
    expect(getTotalExperienceMonths(getCv('en'), now)).toBeGreaterThanOrEqual(60)
  })
})

describe('getExperienceYears', () => {
  it('rounds down to whole years', () => {
    const cv = { experience: [{ start: '2021-04', end: '2026-02' }] } as Parameters<typeof getExperienceYears>[0]

    expect(getExperienceYears(cv)).toBe(4)
  })
})

describe('formatDuration', () => {
  it.each([
    [1, 'en', '1 month'],
    [12, 'en', '1 year'],
    [27, 'en', '2 years 3 months'],
    [0, 'en', '0 months'],
    [1, 'ru', '1 месяц'],
    [3, 'ru', '3 месяца'],
    [11, 'ru', '11 месяцев'],
    [14, 'ru', '1 год 2 месяца'],
    [27, 'ru', '2 года 3 месяца'],
    [65, 'ru', '5 лет 5 месяцев'],
  ])('%i months in "%s" → %s', (months, locale, expected) => {
    expect(formatDuration(months, locale)).toBe(expected)
  })
})

describe('formatYearMonth', () => {
  it('formats a month in the given locale', () => {
    expect(formatYearMonth('2024-10', 'en')).toBe('Oct 2024')
    expect(formatYearMonth('2024-10', 'ru')).toBe('окт. 2024 г.')
  })
})
