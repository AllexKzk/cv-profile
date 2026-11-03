import { Download, FileText, FileUp, UserSearch } from '@lucide/vue'
import type { Component } from 'vue'

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

// Handlers of the quick buttons
export function useQuickActions() {
  const vacancyDialog = useVacancyDialog()
  const scenarios = useLocalScenarios()
  const startInterview = useStartInterview()

  function run(id: QuickActionId) {
    if (id === 'showCv') return scenarios.showCv()
    if (id === 'downloadCv') return scenarios.downloadCv()
    if (id === 'uploadVacancy') return (vacancyDialog.value = true)
    startInterview()
  }

  return { actions: QUICK_ACTIONS, run }
}
