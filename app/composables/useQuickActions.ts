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

// Handlers of the quick buttons. "Who are you looking for?" is a stub until F4.
export function useQuickActions() {
  const { t } = useI18n()
  const exchange = useLocalExchange()
  const vacancyDialog = useVacancyDialog()
  const scenarios = useLocalScenarios()

  function run(id: QuickActionId) {
    if (id === 'showCv') return scenarios.showCv()
    if (id === 'downloadCv') return scenarios.downloadCv()
    if (id === 'uploadVacancy') return (vacancyDialog.value = true)
    exchange(t(`chat.actions.${id}`), t('chat.stub.soon'))
  }

  return { actions: QUICK_ACTIONS, run }
}
