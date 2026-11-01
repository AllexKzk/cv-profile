import { Download, FileText, FileUp, UserSearch } from '@lucide/vue'
import { useFileDialog } from '@vueuse/core'
import type { Component } from 'vue'

export const VACANCY_FILE_ACCEPT = '.pdf,.docx,.md,.txt'

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

// Opens the file picker for a vacancy. In F1 the file is not uploaded anywhere (F5).
export function useVacancyPicker() {
  const { t } = useI18n()
  const exchange = useLocalExchange()
  const { open, onChange } = useFileDialog({ accept: VACANCY_FILE_ACCEPT, multiple: false, reset: true })

  onChange((files) => {
    const file = files?.[0]
    if (file) exchange(file.name, t('chat.stub.soon'))
  })

  return { open }
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

// Handlers of the quick buttons. Uploading a vacancy is a stub until F5.
export function useQuickActions() {
  const picker = useVacancyPicker()
  const scenarios = useLocalScenarios()
  const startInterview = useStartInterview()

  function run(id: QuickActionId) {
    if (id === 'showCv') return scenarios.showCv()
    if (id === 'downloadCv') return scenarios.downloadCv()
    if (id === 'uploadVacancy') return picker.open()
    startInterview()
  }

  return { actions: QUICK_ACTIONS, run }
}
