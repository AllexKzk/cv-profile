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
      <Avatar class="size-20 shrink-0 text-2xl sm:size-24">
        <AvatarImage
          :src="person.photo"
          :alt="person.name"
        />
        <AvatarFallback>{{ initials }}</AvatarFallback>
      </Avatar>
      <div class="identity">
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
      </div>
    </div>
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
  @apply flex items-center gap-4;
}

/* A large avatar beside the name, the title and the key facts, on every screen size */
.identity {
  @apply flex min-w-0 flex-col;
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
  @apply mt-4 flex flex-wrap gap-1.5;
}

.contacts {
  @apply mt-4 flex flex-wrap gap-2;
}
</style>
