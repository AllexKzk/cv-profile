import { SLOT_CONFIG } from '#shared/interview/brief'
import type { AskQuestionInput, QuestionAnswer, VacancyBrief } from '#shared/interview/brief'

type Translate = (key: string, params?: Record<string, unknown>) => string

// Options of a question: the agent's suggestions where the slot allows them, else the fixed ones
export function questionOptions(input: AskQuestionInput, t: Translate): string[] {
  const config = SLOT_CONFIG[input.slot]
  if (config.agentOptions && input.options?.length) return input.options
  if (config.options.length) return config.options.map(key => t(`interview.options.${input.slot}.${key}`))
  return [...(config.fallback ?? [])]
}

export function formatSalary(salary: NonNullable<VacancyBrief['salary']>, t: Translate, locale: string): string {
  const number = (value: number) => value.toLocaleString(locale)
  const { min, max } = salary
  const range = min !== undefined && max !== undefined
    ? `${number(min)}–${number(max)}`
    : min !== undefined
      ? t('interview.salary.from', { value: number(min) })
      : max !== undefined ? t('interview.salary.to', { value: number(max) }) : ''
  return `${range} ${salary.currency} ${t(`interview.salary.period.${salary.period}`)}`.trim()
}

// One line for an answered question
export function formatAnswer(answer: QuestionAnswer, t: Translate, locale: string): string {
  switch (answer.kind) {
    case 'options': return answer.values.join(', ')
    case 'range': return formatSalary(answer, t, locale)
    case 'text': return answer.text
    case 'skipped': return t('interview.skipped')
  }
}
