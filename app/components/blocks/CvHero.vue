<script setup lang="ts">
import { Clock, Briefcase } from '@lucide/vue'
import type { Cv } from '#shared/cv'
import CvCard from './CvCard.vue'

const props = defineProps<{
  person: Cv['person']
  contacts: Cv['contacts']
  experienceYears: number
}>()

const links = useContactLinks(() => props.contacts)

// Shown while the photo loads or when there is none
const initials = computed(() => props.person.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2))
</script>

<template>
  <CvCard>
    <div class="hero">
      <Avatar class="size-20 text-xl">
        <AvatarImage
          :src="person.photo"
          :alt="person.name"
        />
        <AvatarFallback>{{ initials }}</AvatarFallback>
      </Avatar>
      <div class="info">
        <h2 class="name">
          {{ person.name }}
        </h2>
        <p class="title">
          {{ person.title }}
        </p>
        <ul class="facts">
          <li class="fact">
            <Briefcase class="icon" />
            {{ $t('cv.hero.experience', experienceYears) }}
          </li>
          <li class="fact">
            <Clock class="icon" />
            {{ $t('cv.hero.timezone', { timezone: person.timezone }) }}
          </li>
        </ul>
        <ul
          class="formats"
          :aria-label="$t('cv.hero.openTo')"
        >
          <li
            v-for="format in person.openTo"
            :key="format"
          >
            <Badge variant="outline">
              {{ $t(`cv.workFormat.${format}`) }}
            </Badge>
          </li>
        </ul>
      </div>
    </div>
    <nav
      class="contacts"
      :aria-label="$t('topbar.contacts.title')"
    >
      <Button
        v-for="link in links"
        :key="link.id"
        as-child
        variant="outline"
        size="sm"
      >
        <a
          :href="link.href"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noopener noreferrer' : undefined"
        >
          <component :is="link.icon" />
          {{ link.label }}
        </a>
      </Button>
    </nav>
  </CvCard>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.hero {
  @apply flex flex-col gap-4 sm:flex-row sm:items-start;
}

.info {
  @apply flex min-w-0 flex-col gap-1;
}

.name {
  @apply text-xl font-semibold;
}

.title {
  @apply text-muted-foreground;
}

.facts {
  @apply mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm;
}

.fact {
  @apply flex items-center gap-1.5;
}

.icon {
  @apply size-4 text-muted-foreground;
}

.formats {
  @apply mt-2 flex flex-wrap gap-1.5;
}

.contacts {
  @apply mt-4 flex flex-wrap gap-2;
}
</style>
