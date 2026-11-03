import { z } from 'zod'

// Limits shared by the upload UI (to fail early) and the server (to enforce them)
export const VACANCY_LIMITS = {
  // Uploaded file size
  fileBytes: 2 * 1024 * 1024,
  // Pages of a PDF: more is not a job description and costs CPU
  pdfPages: 10,
  // Text the model gets; longer texts are cut
  chars: 20_000,
  // Less than this after extraction means a scan, an image or an empty document
  minChars: 200,
  fileNameChars: 255,
} as const

export const VACANCY_EXTENSIONS = ['pdf', 'docx', 'md', 'txt'] as const
export type VacancyExtension = typeof VACANCY_EXTENSIONS[number]

export const VACANCY_FILE_ACCEPT = VACANCY_EXTENSIONS.map(ext => `.${ext}`).join(',')

// Error codes of /api/parse-vacancy, plus the client-only 'network'; the client maps them to i18n texts
export const VACANCY_ERROR_CODES = ['invalid', 'forbidden', 'too_large', 'unsupported', 'empty_text', 'parse_failed', 'rate_limit'] as const
export type VacancyErrorCode = typeof VACANCY_ERROR_CODES[number]

// A vacancy attached to a user message (`data-vacancy` part)
export const vacancyDataSchema = z.object({
  source: z.enum(['file', 'paste']),
  fileName: z.string().min(1).max(VACANCY_LIMITS.fileNameChars).optional(),
  text: z.string().min(1).max(VACANCY_LIMITS.chars),
  // The original text was longer than the limit and was cut
  truncated: z.boolean().optional(),
})

export type VacancyData = z.infer<typeof vacancyDataSchema>

// Successful answer of /api/parse-vacancy
export interface ParsedVacancy {
  fileName: string
  text: string
  chars: number
  truncated: boolean
}

export function vacancyExtension(fileName: string): VacancyExtension | null {
  const ext = fileName.toLowerCase().split('.').pop()
  return VACANCY_EXTENSIONS.find(known => known === ext) ?? null
}

// Same text for files and pasted text: unified line breaks, no runs of spaces and blank lines
export function normalizeVacancyText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Cuts a normalized text to the limit. The tail of a vacancy is usually "about us" and benefits.
export function clipVacancyText(text: string): { text: string, truncated: boolean } {
  if (text.length <= VACANCY_LIMITS.chars) return { text, truncated: false }
  return { text: text.slice(0, VACANCY_LIMITS.chars).trimEnd(), truncated: true }
}
