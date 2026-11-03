import { useFileDialog } from '@vueuse/core'
import { clipVacancyText, normalizeVacancyText, VACANCY_ERROR_CODES, VACANCY_FILE_ACCEPT, VACANCY_LIMITS, vacancyExtension } from '#shared/vacancy'
import type { ParsedVacancy, VacancyData, VacancyErrorCode } from '#shared/vacancy'

// 'network': the request itself failed, the server never answered with a code
export type VacancyUploadError = VacancyErrorCode | 'network'

// The vacancy waiting in the input until the user sends the message
export type VacancyAttachment
  = | { status: 'loading', fileName: string }
    | { status: 'ready', data: VacancyData }
    | { status: 'error', fileName: string, error: VacancyUploadError }

const isErrorCode = (code: unknown): code is VacancyErrorCode =>
  VACANCY_ERROR_CODES.includes(code as VacancyErrorCode)

async function uploadFile(file: File, signal: AbortSignal): Promise<VacancyData | VacancyUploadError> {
  const body = new FormData()
  body.append('file', file)
  try {
    const response = await fetch('/api/parse-vacancy', { method: 'POST', body, signal })
    const json = await response.json().catch(() => null) as Partial<ParsedVacancy> & { code?: unknown } | null
    if (response.ok && json?.text) {
      return { source: 'file', fileName: json.fileName || file.name, text: json.text, truncated: json.truncated || undefined }
    }
    return isErrorCode(json?.code) ? json.code : 'network'
  }
  catch {
    return 'network'
  }
}

// The upload in flight. Module-level, so every caller sees it; uploads only run in the browser.
// A newer upload or a removal makes the answer of an older request stale.
let controller: AbortController | undefined

// The pending attachment, shared by the input, the drop zone and the "Upload a vacancy" dialog.
// One per message: a new file or text replaces the previous one.
export function useVacancyUpload() {
  const attachment = useState<VacancyAttachment | null>('vacancy-attachment', () => null)

  function clear() {
    controller?.abort()
    attachment.value = null
  }

  async function attachFile(file: File) {
    controller?.abort()
    const fileName = file.name

    // Checked here too, so a wrong file fails at once and is never sent
    if (!vacancyExtension(fileName)) return (attachment.value = { status: 'error', fileName, error: 'unsupported' })
    if (file.size > VACANCY_LIMITS.fileBytes) return (attachment.value = { status: 'error', fileName, error: 'too_large' })

    const current = new AbortController()
    controller = current
    attachment.value = { status: 'loading', fileName }

    const result = await uploadFile(file, current.signal)
    if (current.signal.aborted) return
    attachment.value = typeof result === 'string'
      ? { status: 'error', fileName, error: result }
      : { status: 'ready', data: result }
  }

  // Pasted text skips the server: it is already text. Returns false when it is too short to be a vacancy.
  function attachText(raw: string): boolean {
    const normalized = normalizeVacancyText(raw)
    if (normalized.length < VACANCY_LIMITS.minChars) return false
    controller?.abort()
    const { text, truncated } = clipVacancyText(normalized)
    attachment.value = { status: 'ready', data: { source: 'paste', text, truncated: truncated || undefined } }
    return true
  }

  return { attachment, attachFile, attachText, clear }
}

// System file picker for a vacancy (the paperclip and the dialog)
export function useVacancyPicker(onPick: (file: File) => void) {
  const { open, onChange } = useFileDialog({ accept: VACANCY_FILE_ACCEPT, multiple: false, reset: true })
  onChange((files) => {
    const file = files?.[0]
    if (file) onPick(file)
  })
  return { open }
}

// Open state of the "Upload a vacancy" dialog: the quick action opens it, the shell renders it
export function useVacancyDialog() {
  return useState('vacancy-dialog-open', () => false)
}
