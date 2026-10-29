<script setup lang="ts">
import { Mail } from '@lucide/vue'
import GithubIcon from '~/components/icons/GithubIcon.vue'
import LinkedinIcon from '~/components/icons/LinkedinIcon.vue'
import TelegramIcon from '~/components/icons/TelegramIcon.vue'

const cv = useCv()
const { t } = useI18n()

const links = computed(() => {
  const { telegram, linkedin, github, email } = cv.value.contacts
  return [
    { id: 'telegram', href: telegram, icon: TelegramIcon, external: true },
    { id: 'linkedin', href: linkedin, icon: LinkedinIcon, external: true },
    { id: 'github', href: github, icon: GithubIcon, external: true },
    { id: 'email', href: `mailto:${email}`, icon: Mail, external: false },
  ].map(link => ({ ...link, label: t(`topbar.contacts.${link.id}`) }))
})
</script>

<template>
  <nav
    class="contacts"
    :aria-label="$t('topbar.contacts.title')"
  >
    <Tooltip
      v-for="link in links"
      :key="link.id"
    >
      <TooltipTrigger as-child>
        <Button
          as-child
          variant="ghost"
          size="icon"
        >
          <a
            :href="link.href"
            :aria-label="link.label"
            :target="link.external ? '_blank' : undefined"
            :rel="link.external ? 'noopener noreferrer' : undefined"
          >
            <component :is="link.icon" />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{{ link.label }}</TooltipContent>
    </Tooltip>
  </nav>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.contacts {
  @apply flex items-center gap-0.5;
}
</style>
