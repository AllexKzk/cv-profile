import type { VacancyErrorCode } from '#shared/vacancy'
import { isForeignOrigin } from '../guard'
import type { RequestWindow } from '../rate-limit'
import { parseVacancyFile } from './parse'

export interface UploadedFile {
  name: string
  data: Uint8Array
}

export interface ParseVacancyContext {
  // Parts of the multipart body named `file`; undefined when the body was refused unread
  files: UploadedFile[] | undefined
  ip: string
  origin?: string
  host?: string
  window: RequestWindow
}

const STATUS: Record<VacancyErrorCode, number> = {
  invalid: 400,
  forbidden: 403,
  too_large: 413,
  unsupported: 415,
  empty_text: 422,
  parse_failed: 422,
  rate_limit: 429,
}

export function vacancyErrorResponse(code: VacancyErrorCode): Response {
  return Response.json({ code }, { status: STATUS[code] })
}

// POST /api/parse-vacancy without h3: origin → rate limit → one file → text
export async function handleParseVacancy(ctx: ParseVacancyContext): Promise<Response> {
  if (isForeignOrigin(ctx.origin, ctx.host)) return vacancyErrorResponse('forbidden')
  if (!ctx.files) return vacancyErrorResponse('too_large')
  if (!(await ctx.window.limit(ctx.ip)).success) return vacancyErrorResponse('rate_limit')

  const [file, ...rest] = ctx.files
  if (!file || rest.length) return vacancyErrorResponse('invalid')

  const result = await parseVacancyFile(file)
  if ('code' in result) return vacancyErrorResponse(result.code)
  return Response.json(result.vacancy)
}
