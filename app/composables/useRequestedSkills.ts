import { isSkillRequested, requestedSkillKeys } from '#shared/cv/skill-match'

// Skills the visitor asked for anywhere in this chat: skill requirements of an analyzed vacancy,
// the stack of an interview brief and skills named in their own messages. CV blocks highlight them.
export function useRequestedSkills() {
  const { messages } = useCvChat()
  const cv = useCv()

  const keys = computed(() => {
    const requirements: string[] = []
    const texts: string[] = []
    for (const message of messages.value) {
      for (const part of message.parts) {
        if (message.role === 'user' && part.type === 'text') texts.push(part.text)
        if (part.type === 'tool-analyzeVacancy' && part.state === 'output-available') {
          requirements.push(...part.output.requirements.filter(r => r.category === 'stack').map(r => r.name))
        }
        if (part.type === 'tool-submitBrief' && part.input) {
          // A brief still streaming in may hold half-written entries
          for (const name of [...(part.input.mustHave ?? []), ...(part.input.niceToHave ?? [])]) {
            if (name) requirements.push(name)
          }
        }
      }
    }
    return requestedSkillKeys(cv.value, requirements, texts)
  })

  /** Whether a CV skill, known by these names (its name and aliases), was asked for. */
  return (names: string[]) => isSkillRequested(keys.value, names)
}
