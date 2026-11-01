import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { handleParseVacancy } from '../../../server/utils/vacancy/handler'
import type { ParseVacancyContext } from '../../../server/utils/vacancy/handler'
import { parseVacancyFile } from '../../../server/utils/vacancy/parse'
import { openWindow } from '../../../server/utils/rate-limit'
import { VACANCY_LIMITS } from '../../../shared/vacancy'

const fixture = async (name: string) =>
  new Uint8Array(await readFile(new URL(`../../fixtures/vacancy/${name}`, import.meta.url)))

const parse = async (name: string, fileName = name) => parseVacancyFile({ name: fileName, data: await fixture(name) })

const text = (body: string) => new TextEncoder().encode(body)
const LONG_LINE = 'Vue 3, TypeScript and Nuxt in a product team. '

describe('parseVacancyFile', () => {
  it.each(['vacancy.pdf', 'vacancy.docx', 'vacancy.md', 'vacancy.txt'])('extracts text from %s', async (name) => {
    const result = await parse(name)
    expect(result).toMatchObject({ vacancy: { fileName: name, truncated: false } })
    if (!('vacancy' in result)) return
    expect(result.vacancy.text).toContain('Senior Frontend Engineer at Acme')
    expect(result.vacancy.text).toContain('English B2 or higher')
    expect(result.vacancy.chars).toBe(result.vacancy.text.length)
  })

  it('reads a PDF given as a Buffer, as h3 passes uploads', async () => {
    const result = await parseVacancyFile({ name: 'vacancy.pdf', data: Buffer.from(await fixture('vacancy.pdf')) })
    expect(result).toHaveProperty('vacancy')
  })

  it('reports a PDF without text as empty', async () => {
    expect(await parse('blank.pdf')).toEqual({ code: 'empty_text' })
  })

  it('refuses a file whose content does not match the extension', async () => {
    expect(await parse('fake.pdf')).toEqual({ code: 'unsupported' })
    expect(await parse('vacancy.txt', 'vacancy.docx')).toEqual({ code: 'unsupported' })
    expect(await parse('vacancy.pdf', 'vacancy.txt')).toEqual({ code: 'unsupported' })
  })

  it('refuses unknown extensions', async () => {
    expect(await parse('vacancy.txt', 'vacancy.rtf')).toEqual({ code: 'unsupported' })
    expect(await parse('vacancy.txt', 'vacancy')).toEqual({ code: 'unsupported' })
  })

  it('reports a broken DOCX as a parse failure', async () => {
    expect(await parse('broken.docx')).toEqual({ code: 'parse_failed' })
  })

  it('refuses files over the size limit and empty files', async () => {
    expect(await parseVacancyFile({ name: 'big.txt', data: new Uint8Array(VACANCY_LIMITS.fileBytes + 1) })).toEqual({ code: 'too_large' })
    expect(await parseVacancyFile({ name: 'empty.txt', data: new Uint8Array() })).toEqual({ code: 'invalid' })
  })

  it('refuses text that is not UTF-8', async () => {
    expect(await parseVacancyFile({ name: 'latin1.txt', data: new Uint8Array([0xC0, 0xC1, 0xF5, 0xFF]) })).toEqual({ code: 'unsupported' })
  })

  it('normalizes whitespace and cuts long texts to the limit', async () => {
    const body = `  Title\r\n\r\n\r\n\r\n${LONG_LINE.repeat(1000)}   `
    const result = await parseVacancyFile({ name: 'long.md', data: text(body) })
    if (!('vacancy' in result)) throw new Error('expected a vacancy')
    expect(result.vacancy.text.startsWith('Title\n\nVue 3')).toBe(true)
    expect(result.vacancy.chars).toBeLessThanOrEqual(VACANCY_LIMITS.chars)
    expect(result.vacancy.truncated).toBe(true)
  })
})

describe('handleParseVacancy', () => {
  const context = async (overrides: Partial<ParseVacancyContext> = {}): Promise<ParseVacancyContext> => ({
    files: [{ name: 'vacancy.txt', data: await fixture('vacancy.txt') }],
    ip: '1.1.1.1',
    origin: 'https://allexkzk.dev',
    host: 'allexkzk.dev',
    window: openWindow,
    ...overrides,
  })
  const code = async (response: Response) => ((await response.json()) as { code: string }).code

  it('answers with the parsed text', async () => {
    const response = await handleParseVacancy(await context())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ fileName: 'vacancy.txt', truncated: false })
  })

  it('maps errors to codes and statuses', async () => {
    const cases: [Partial<ParseVacancyContext>, number, string][] = [
      [{ origin: 'https://evil.example' }, 403, 'forbidden'],
      [{ files: undefined }, 413, 'too_large'],
      [{ files: [] }, 400, 'invalid'],
      [{ files: [{ name: 'a.txt', data: text('a') }, { name: 'b.txt', data: text('b') }] }, 400, 'invalid'],
      [{ files: [{ name: 'a.exe', data: text('a') }] }, 415, 'unsupported'],
      [{ files: [{ name: 'short.txt', data: text('Too short') }] }, 422, 'empty_text'],
      [{ window: { limit: async () => ({ success: false }) } }, 429, 'rate_limit'],
    ]
    for (const [overrides, status, expected] of cases) {
      const response = await handleParseVacancy(await context(overrides))
      expect(response.status).toBe(status)
      expect(await code(response)).toBe(expected)
    }
  })
})
