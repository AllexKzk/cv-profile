import { clipVacancyText, normalizeVacancyText, VACANCY_LIMITS, vacancyExtension } from '#shared/vacancy'
import type { ParsedVacancy, VacancyErrorCode, VacancyExtension } from '#shared/vacancy'

export type ParseResult = { vacancy: ParsedVacancy } | { code: VacancyErrorCode }

const startsWith = (data: Uint8Array, signature: string) =>
  [...signature].every((char, index) => data[index] === char.charCodeAt(0))

// Zip keeps entry names uncompressed, so a DOCX names its main part in plain bytes
const DOCX_MAIN_PART = new TextEncoder().encode('word/document.xml')

function includesBytes(data: Uint8Array, needle: Uint8Array): boolean {
  outer: for (let i = 0; i <= data.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (data[i + j] !== needle[j]) continue outer
    }
    return true
  }
  return false
}

// The extension must match the content: a renamed binary is refused before any parser sees it
function matchesSignature(ext: VacancyExtension, data: Uint8Array): boolean {
  if (ext === 'pdf') return startsWith(data, '%PDF-')
  if (ext === 'docx') return startsWith(data, 'PK\x03\x04') && includesBytes(data, DOCX_MAIN_PART)
  // Text: no NUL bytes and not a PDF or a zip under a text extension
  return !data.includes(0) && !startsWith(data, '%PDF-') && !startsWith(data, 'PK\x03\x04')
}

class TooManyPages extends Error {}

async function extractPdf(data: Uint8Array): Promise<string> {
  // Imported here: pdf.js is heavy and only this route needs it
  const { extractText, getDocumentProxy } = await import('unpdf')
  // A plain Uint8Array copy: pdf.js refuses a Buffer (what h3 reads uploads into) and may
  // detach the buffer it gets
  const pdf = await getDocumentProxy(new Uint8Array(data), { maxImageSize: 16_777_216 })
  if (pdf.numPages > VACANCY_LIMITS.pdfPages) throw new TooManyPages()
  const { text } = await extractText(pdf, { mergePages: true })
  return text
}

async function extractDocx(data: Uint8Array): Promise<string> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data) })
  return value
}

function extract(ext: VacancyExtension, data: Uint8Array): Promise<string> | string {
  if (ext === 'pdf') return extractPdf(data)
  if (ext === 'docx') return extractDocx(data)
  // fatal: a binary file renamed to .txt is not decoded into garbage
  return new TextDecoder('utf-8', { fatal: true }).decode(data)
}

// File → normalized vacancy text. Pure: the route only reads the upload and answers.
export async function parseVacancyFile({ name, data }: { name: string, data: Uint8Array }): Promise<ParseResult> {
  if (!name || !data.length) return { code: 'invalid' }
  if (data.length > VACANCY_LIMITS.fileBytes) return { code: 'too_large' }

  const ext = vacancyExtension(name)
  if (!ext || !matchesSignature(ext, data)) return { code: 'unsupported' }

  let raw: string
  try {
    raw = await extract(ext, data)
  }
  catch (error) {
    if (error instanceof TooManyPages) return { code: 'too_large' }
    // A text file that is not UTF-8 is a format problem, a broken PDF/DOCX is a parse problem
    if (error instanceof TypeError && ext !== 'pdf' && ext !== 'docx') return { code: 'unsupported' }
    console.warn('[parse-vacancy] failed to parse', ext, error)
    return { code: 'parse_failed' }
  }

  const normalized = normalizeVacancyText(raw)
  if (normalized.length < VACANCY_LIMITS.minChars) return { code: 'empty_text' }

  const { text, truncated } = clipVacancyText(normalized)
  return {
    vacancy: { fileName: name.slice(0, VACANCY_LIMITS.fileNameChars), text, chars: text.length, truncated },
  }
}
