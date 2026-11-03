import type { Priorities, Priority } from '#shared/match/report'
import type { CvUIMessage } from '#shared/types/chat'

// The visitor's answers to the clarifications of one match report. They live as a `data-priorities`
// part at the end of the analysis message: no request, saved with history, seen by the model later.
export function useMatchPriorities(toolCallId: MaybeRefOrGetter<string>) {
  const { messages, status } = useCvChat()

  const index = computed(() => messages.value.findIndex(message =>
    message.parts.some(part => part.type === 'tool-analyzeVacancy' && part.toolCallId === toValue(toolCallId))))

  const values = computed<Priorities>(() => {
    const part = messages.value[index.value]?.parts
      .find(part => part.type === 'data-priorities' && part.data.source === toValue(toolCallId))
    return part?.type === 'data-priorities' ? part.data.values : {}
  })

  // The message is still streaming: an edit now would be overwritten by the stream
  const busy = computed(() => status.value !== 'ready' && status.value !== 'error' && index.value === messages.value.length - 1)

  function write(next: Priorities) {
    const at = index.value
    const message = messages.value[at]
    if (!message || busy.value) return
    const source = toValue(toolCallId)
    const parts = message.parts.filter(part => !(part.type === 'data-priorities' && part.data.source === source))
    if (Object.keys(next).length) parts.push({ type: 'data-priorities', data: { source, values: next } })
    const updated: CvUIMessage = { ...message, parts }
    messages.value = messages.value.map((item, i) => (i === at ? updated : item))
  }

  // "must" is what the analysis said: only the changed answers are stored
  function set(name: string, priority: Priority) {
    const { [name]: _, ...rest } = values.value
    write(priority === 'must' ? rest : { ...rest, [name]: priority })
  }

  const reset = () => write({})

  return { values, busy, set, reset }
}
