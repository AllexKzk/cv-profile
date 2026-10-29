import type { ChatTransport, UIMessageChunk } from 'ai'
import type { CvUIMessage } from '#shared/types/chat'

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Offline transport until the real /api/chat lands in F3: replies with a fixed text,
// streamed word by word so the UI goes through the same statuses as with a real model.
export function createStubTransport(
  getReply: () => string,
  { delay = 600, wordDelay = 30 } = {},
): ChatTransport<CvUIMessage> {
  return {
    async sendMessages({ abortSignal }) {
      const text = getReply()
      return new ReadableStream<UIMessageChunk>({
        async start(controller) {
          const push = (chunk: UIMessageChunk) => {
            if (!abortSignal?.aborted) controller.enqueue(chunk)
          }

          await wait(delay)
          push({ type: 'start' })
          push({ type: 'text-start', id: 'stub' })
          for (const word of text.split(/(?<= )/)) {
            push({ type: 'text-delta', id: 'stub', delta: word })
            await wait(wordDelay)
          }
          push({ type: 'text-end', id: 'stub' })
          push({ type: 'finish' })
          controller.close()
        },
      })
    },
    async reconnectToStream() {
      return null
    },
  }
}
