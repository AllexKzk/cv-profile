import { common } from './data/common'
import { en } from './data/en'
import { ru } from './data/ru'
import { z } from 'zod'
import { CvCommonSchema, CvSchema, CvTextsSchema } from './schema'
import type { Cv, CvCommonInput, CvTextsInput, Locale } from './schema'

export * from './schema'
export * from './duration'

const texts: Record<Locale, CvTextsInput> = { en, ru }

// Readable error like "✖ Expected YYYY-MM → at experience[0].start" with the source file name
function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown, source: string): z.output<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new Error(`Invalid CV data in ${source}:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

// Every id from common data must have texts, and texts must not have unknown ids
function assertSameIds(section: string, commonIds: string[], textIds: string[], locale: Locale) {
  const missing = commonIds.filter(id => !textIds.includes(id))
  const unknown = textIds.filter(id => !commonIds.includes(id))
  if (missing.length || unknown.length) {
    throw new Error(
      `CV texts "${locale}" mismatch in ${section}: `
      + `missing [${missing.join(', ')}], unknown [${unknown.join(', ')}]`,
    )
  }
}

// Validates common data and locale texts, then merges them by id
export function buildCv(locale: Locale, commonInput: CvCommonInput, textsInput: CvTextsInput): Cv {
  const data = parseOrThrow(CvCommonSchema, commonInput, 'data/common.ts')
  const t = parseOrThrow(CvTextsSchema, textsInput, `data/${locale}.ts`)

  assertSameIds('experience', data.experience.map(e => e.id), Object.keys(t.experience), locale)
  assertSameIds('education', data.education.map(e => e.id), Object.keys(t.education), locale)
  assertSameIds('skillGroups', data.skills.map(s => s.id), Object.keys(t.skillGroups), locale)

  return parseOrThrow(CvSchema, {
    locale,
    person: {
      name: data.person.name[locale],
      title: t.title,
      photo: data.person.photo,
      timezone: data.person.timezone,
      openTo: data.person.openTo,
    },
    contacts: data.contacts,
    pdf: data.files.pdf[locale],
    about: t.about,
    experience: data.experience.map(item => ({ ...item, ...t.experience[item.id] })),
    education: data.education.map(item => ({ ...item, ...t.education[item.id] })),
    skills: data.skills.map(group => ({ ...group, name: t.skillGroups[group.id] })),
    languages: t.languages,
    updatedAt: data.updatedAt,
  }, `merged CV "${locale}"`)
}

const cache = new Map<Locale, Cv>()

export function getCv(locale: Locale): Cv {
  let cv = cache.get(locale)
  if (!cv) {
    cv = buildCv(locale, common, texts[locale])
    cache.set(locale, cv)
  }
  return cv
}
