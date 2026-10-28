import { z } from 'zod'

export const LOCALES = ['en', 'ru'] as const
export type Locale = typeof LOCALES[number]

// 'YYYY-MM', e.g. '2024-10'
export const YearMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM')

const WorkFormatSchema = z.enum(['remote', 'hybrid', 'office', 'relocation'])

const ContactsSchema = z.object({
  email: z.email(),
  telegram: z.url(),
  linkedin: z.url(),
  github: z.url(),
  site: z.url(),
})

const SkillItemSchema = z.object({
  name: z.string().min(1),
  // Alternative spellings used to match vacancy requirements ('Vue.js' → 'Vue')
  aliases: z.array(z.string()).default([]),
  // Highlighted in the UI
  main: z.boolean().default(false),
})

const LanguageSchema = z.object({ name: z.string(), level: z.string() })

// Language-independent facts, shared by all locales
export const CvCommonSchema = z.object({
  person: z.object({
    name: z.record(z.enum(LOCALES), z.string().min(1)),
    photo: z.string().startsWith('/'),
    timezone: z.string().min(1),
    openTo: z.array(WorkFormatSchema),
  }),
  contacts: ContactsSchema,
  files: z.object({
    pdf: z.record(z.enum(LOCALES), z.string().startsWith('/')),
  }),
  experience: z.array(z.object({
    id: z.string().min(1),
    company: z.string().min(1),
    url: z.url().optional(),
    start: YearMonthSchema,
    // null means "present"
    end: YearMonthSchema.nullable(),
    stack: z.array(z.string()),
  })),
  education: z.array(z.object({
    id: z.string().min(1),
    start: z.number().int(),
    end: z.number().int(),
  })),
  skills: z.array(z.object({
    id: z.string().min(1),
    items: z.array(SkillItemSchema),
  })),
  updatedAt: YearMonthSchema,
})

// Texts for one locale, linked to common data by id
export const CvTextsSchema = z.object({
  title: z.string().min(1),
  about: z.array(z.string().min(1)),
  experience: z.record(z.string(), z.object({
    role: z.string().min(1),
    summary: z.string().min(1),
    highlights: z.array(z.string().min(1)),
  })),
  education: z.record(z.string(), z.object({
    degree: z.string().min(1),
    institution: z.string().min(1),
  })),
  skillGroups: z.record(z.string(), z.string().min(1)),
  languages: z.array(LanguageSchema),
})

// Merged CV for one locale: the only shape UI and prompts work with
export const CvSchema = z.object({
  locale: z.enum(LOCALES),
  person: z.object({
    name: z.string(),
    title: z.string(),
    photo: z.string(),
    timezone: z.string(),
    openTo: z.array(WorkFormatSchema),
  }),
  contacts: ContactsSchema,
  pdf: z.string(),
  about: z.array(z.string()),
  experience: z.array(z.object({
    id: z.string(),
    company: z.string(),
    url: z.url().optional(),
    start: YearMonthSchema,
    end: YearMonthSchema.nullable(),
    stack: z.array(z.string()),
    role: z.string(),
    summary: z.string(),
    highlights: z.array(z.string()),
  })),
  education: z.array(z.object({
    id: z.string(),
    start: z.number().int(),
    end: z.number().int(),
    degree: z.string(),
    institution: z.string(),
  })),
  skills: z.array(z.object({
    id: z.string(),
    name: z.string(),
    items: z.array(SkillItemSchema),
  })),
  languages: z.array(LanguageSchema),
  updatedAt: YearMonthSchema,
})

export type CvCommonInput = z.input<typeof CvCommonSchema>
export type CvTextsInput = z.input<typeof CvTextsSchema>
export type Cv = z.output<typeof CvSchema>
export type CvExperience = Cv['experience'][number]
export type CvEducation = Cv['education'][number]
export type CvSkillGroup = Cv['skills'][number]
export type WorkFormat = z.output<typeof WorkFormatSchema>
