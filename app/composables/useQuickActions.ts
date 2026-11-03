import { Download, FileText, FileUp, UserSearch } from '@lucide/vue'
import type { Component } from 'vue'
import type { CvUIMessage } from '#shared/types/chat'

export type QuickActionId = 'showCv' | 'lookingFor' | 'downloadCv' | 'uploadVacancy'

export interface QuickAction {
  id: QuickActionId
  icon: Component
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'showCv', icon: FileText },
  { id: 'lookingFor', icon: UserSearch },
  { id: 'downloadCv', icon: Download },
  { id: 'uploadVacancy', icon: FileUp },
]

// The trace each action leaves in the history
const TRACES: Record<QuickActionId, (part: CvUIMessage['parts'][number], message: CvUIMessage) => boolean> = {
  showCv: part => part.type === 'data-cv',
  downloadCv: part => part.type === 'data-download',
  lookingFor: (part, message) => message.role === 'user' && part.type === 'data-interview',
  uploadVacancy: part => part.type === 'data-vacancy',
}

/** Actions the visitor has already used in this chat: their buttons are not offered again. */
export function usedQuickActions(messages: CvUIMessage[]): Set<QuickActionId> {
  const used = new Set<QuickActionId>()
  for (const message of messages) {
    for (const part of message.parts) {
      for (const action of QUICK_ACTIONS) {
        if (TRACES[action.id](part, message)) used.add(action.id)
      }
    }
  }
  return used
}

// Starts the interview: the invisible `data-interview` part switches the chat to that scenario
export function useStartInterview() {
  const { t } = useI18n()
  const { status, sendMessage, clearError } = useCvChat()

  return () => {
    // Another answer is on its way: the composer is busy too
    if (status.value === 'submitted' || status.value === 'streaming') return
    clearError()
    sendMessage({ parts: [{ type: 'text', text: t('chat.actions.lookingFor') }, { type: 'data-interview', data: {} }] })
  }
}

// Handlers of the quick buttons; actions already used in this chat are left out
export function useQuickActions() {
  const { messages } = useCvChat()
  const vacancyDialog = useVacancyDialog()
  const scenarios = useLocalScenarios()
  const startInterview = useStartInterview()

  function run(id: QuickActionId) {
    if (id === 'showCv') return scenarios.showCv()
    if (id === 'downloadCv') return scenarios.downloadCv()
    if (id === 'uploadVacancy') return (vacancyDialog.value = true)
    startInterview()
  }

  const actions = computed(() => {
    const used = usedQuickActions(messages.value)
    return QUICK_ACTIONS.filter(action => !used.has(action.id))
  })

  return { actions, run }
}
