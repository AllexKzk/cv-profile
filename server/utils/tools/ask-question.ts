import { tool } from 'ai'
import { cvToolSchemas } from '#shared/types/chat'

// Client tool: no `execute`, the stream ends on the call and the widget waits for the visitor.
// The answer comes back as the tool output with the next request.
export const askQuestion = tool({
  description: 'Ask the visitor one interview question about one slot of the vacancy brief. The site renders a widget for the slot (options, salary range or text) and returns what the visitor picked or typed; kind "skipped" means no answer. Several calls in one step are shown together as one round. `options` are suggestions for the slots role, mustHave, niceToHave and domain only, in the visitor\'s language for words, technology names as is.',
  ...cvToolSchemas.askQuestion,
})
