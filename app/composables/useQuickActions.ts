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

// Handlers of the quick buttons. The rest are stubs until F3–F5 replace them.
export function useQuickActions() {
  const { t } = useI18n()
  const exchange = useLocalExchange()
  const picker = useVacancyPicker()
  const scenarios = useLocalScenarios()

  function run(id: QuickActionId) {
    if (id === 'showCv') return scenarios.showCv()
    if (id === 'downloadCv') return scenarios.downloadCv()
    if (id === 'uploadVacancy') return picker.open()
    exchange(t(`chat.actions.${id}`), t('chat.stub.soon'))
  }

  return { actions: QUICK_ACTIONS, run }
}
