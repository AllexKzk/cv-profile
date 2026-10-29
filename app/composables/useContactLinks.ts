import { Mail } from '@lucide/vue'
import type { MaybeRefOrGetter } from 'vue'
import type { Cv } from '#shared/cv'
import GithubIcon from '~/components/icons/GithubIcon.vue'
import LinkedinIcon from '~/components/icons/LinkedinIcon.vue'
import TelegramIcon from '~/components/icons/TelegramIcon.vue'

// Contact links with icons and labels: icons in the TopBar, labelled buttons in CvHero
export function useContactLinks(contacts: MaybeRefOrGetter<Cv['contacts']>) {
  const { t } = useI18n()

  return computed(() => {
    const { telegram, linkedin, github, email } = toValue(contacts)
    return [
      { id: 'telegram', href: telegram, icon: TelegramIcon, external: true },
      { id: 'linkedin', href: linkedin, icon: LinkedinIcon, external: true },
      { id: 'github', href: github, icon: GithubIcon, external: true },
      { id: 'email', href: `mailto:${email}`, icon: Mail, external: false },
    ].map(link => ({ ...link, label: t(`topbar.contacts.${link.id}`) }))
  })
}
