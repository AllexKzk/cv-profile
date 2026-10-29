import { CV_SECTIONS } from '#shared/types/chat'
import { downloadFile } from '~/lib/download'

// Quick actions answered without the LLM: the reply is built from CV blocks
export function useLocalScenarios() {
  const { t } = useI18n()
  const cv = useCv()
  const exchange = useLocalExchange()

  function showCv() {
    exchange(t('chat.actions.showCv'), CV_SECTIONS.map(section => ({ type: 'data-cv', data: { section } })))
  }

  // The card stays in the chat for downloading again; the file of the current locale starts right away
  function downloadCv() {
    exchange(t('chat.actions.downloadCv'), [{ type: 'data-download', data: {} }])
    downloadFile(cv.value.pdf)
  }

  return { showCv, downloadCv }
}
