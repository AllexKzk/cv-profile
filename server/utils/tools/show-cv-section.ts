import { tool } from 'ai'
import { cvToolSchemas } from '#shared/types/chat'

// The part only references the section: the client renders the CV block of the current locale
export const showCvSection = tool({
  description: 'Show a CV section to the visitor as a rich block: hero (overview with contacts), about, experience, education (with languages), skills. For experience, pass `items` with job ids from the CV to show only those jobs; omit it to show all of them.',
  ...cvToolSchemas.showCvSection,
  // Echoes the input: section and the picked items are all the client needs
  execute: async input => input,
})
