import { getCv } from '#shared/cv'
import type { Locale } from '#shared/cv'

// CV of the current locale, recomputed when the language changes
export function useCv() {
  const { locale } = useI18n()
  return computed(() => getCv(locale.value as Locale))
}
