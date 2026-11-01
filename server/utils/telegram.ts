import type { BriefFit, VacancyBrief } from '#shared/interview/brief'
import type { LeadRequest } from '#shared/lead'

export interface TelegramConfig {
  token: string
  chatId: string
}

// Everything the visitor typed goes through this: parse_mode HTML must not see their markup
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const FORMAT_FIT: Record<BriefFit['format'], string> = {
  match: 'подходит',
  relocation: 'через релокацию',
  mismatch: 'не подходит',
  unknown: 'не указан',
}

function skills(list: BriefFit['mustHave']): string {
  return list.map(skill => `${escapeHtml(skill.name)} ${skill.inCv ? '✅' : '❌'}`).join(', ')
}

function salary(value: NonNullable<VacancyBrief['salary']>): string {
  const range = [value.min, value.max].map(n => (n === undefined ? '' : n.toLocaleString('ru-RU'))).join('–')
  return `${range} ${value.currency} / ${value.period === 'month' ? 'мес' : 'год'}`
}

// The message for the owner: labels in Russian, values as the visitor typed them
export function formatLead(lead: LeadRequest): string {
  const { brief, fit } = lead
  const line = (label: string, value: string | undefined) => (value ? `${label}: ${value}` : undefined)
  const text = (value: string | undefined) => (value ? escapeHtml(value) : undefined)

  const contact = [
    '<b>Новая заявка с сайта</b>',
    line('Контакт', text(lead.contact)),
    line('Имя', text(lead.name)),
    line('Компания', text(lead.company)),
    line('Комментарий', text(lead.comment)),
  ]
  const summary = [
    '',
    '<b>Бриф</b>',
    line('Роль', text([brief.seniority, brief.role].filter(Boolean).join(' ') || undefined)),
    line('Must-have', fit.mustHave.length ? `${skills(fit.mustHave)} (${fit.mustHave.filter(s => s.inCv).length}/${fit.mustHave.length} в резюме)` : undefined),
    line('Nice-to-have', fit.niceToHave.length ? skills(fit.niceToHave) : undefined),
    line('Формат', brief.format?.length ? `${brief.format.join(', ')} (${FORMAT_FIT[fit.format]})` : undefined),
    line('Локация', text(brief.location)),
    line('Домен', text(brief.domain)),
    line('Занятость', text(brief.employment)),
    line('Вилка', brief.salary ? salary(brief.salary) : undefined),
    line('Старт', text(brief.start)),
    line('Компания (из брифа)', text(brief.company)),
    line('Заметки', text(brief.notes)),
    '',
    `Язык сайта: ${lead.locale}`,
  ]
  return [...contact, ...summary].filter(value => value !== undefined).join('\n')
}

// sendMessage of the Bot API; throws on a network error, a timeout or a refusal
export async function sendTelegram(config: TelegramConfig, text: string, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(`https://api.telegram.org/bot${config.token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: config.chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Telegram answered ${response.status}: ${await response.text()}`)
}
