import { formatDuration, formatYearMonth, getExperienceYears, monthsBetween } from '#shared/cv'
import type { Cv } from '#shared/cv'

// CV as compact plain text for the system prompt: cheaper than JSON and easier for the model to read.
// Durations are computed here, models are bad at date arithmetic.
export function serializeCv(cv: Cv, now: Date = new Date()): string {
  const { locale } = cv
  const period = (start: string, end: string | null) =>
    `${formatYearMonth(start, locale)} – ${end ? formatYearMonth(end, locale) : 'present'}`
    + ` (${formatDuration(monthsBetween(start, end, now), locale)})`

  const lines: string[] = [
    `Name: ${cv.person.name}`,
    `Title: ${cv.person.title}`,
    `Total experience: ${getExperienceYears(cv, now)}+ years`,
    `Timezone: ${cv.person.timezone}`,
    `Open to: ${cv.person.openTo.join(', ')}`,
    `Contacts: email ${cv.contacts.email}, Telegram ${cv.contacts.telegram}, LinkedIn ${cv.contacts.linkedin}, GitHub ${cv.contacts.github}`,
    '',
    '## About',
    ...cv.about,
    '',
    '## Experience',
  ]

  for (const job of cv.experience) {
    lines.push(
      '',
      `### ${job.role} — ${job.company}, ${period(job.start, job.end)}`,
      job.summary,
      ...job.highlights.map(item => `- ${item}`),
      `Stack: ${job.stack.join(', ')}`,
    )
  }

  lines.push('', '## Education')
  for (const item of cv.education) lines.push(`- ${item.degree}, ${item.institution}, ${item.start}–${item.end}`)

  lines.push('', '## Skills')
  for (const group of cv.skills) {
    const items = group.items.map(skill => (skill.main ? `${skill.name} (main)` : skill.name))
    lines.push(`- ${group.name}: ${items.join(', ')}`)
  }

  lines.push('', '## Languages')
  for (const language of cv.languages) lines.push(`- ${language.name}: ${language.level}`)

  return lines.join('\n')
}
