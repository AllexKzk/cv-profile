<script setup lang="ts">
import type { Cv, CvEducation } from '#shared/cv'
import CvCard from './CvCard.vue'

defineProps<{
  items: CvEducation[]
  languages: Cv['languages']
}>()
</script>

<template>
  <CvCard :title="$t('cv.sections.education')">
    <ul class="list">
      <li
        v-for="item in items"
        :key="item.id"
        class="item"
      >
        <h4 class="degree">
          {{ item.degree }}
        </h4>
        <p>{{ item.institution }}</p>
        <p class="years">
          {{ item.start }} — {{ item.end }}
        </p>
      </li>
    </ul>
    <template v-if="languages.length">
      <h4 class="subtitle">
        {{ $t('cv.sections.languages') }}
      </h4>
      <ul class="languages">
        <li
          v-for="language in languages"
          :key="language.name"
        >
          {{ language.name }} <span class="level">— {{ language.level }}</span>
        </li>
      </ul>
    </template>
  </CvCard>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.list {
  @apply flex flex-col gap-4;
}

.item {
  @apply flex flex-col gap-0.5;
}

.degree {
  @apply font-semibold;
}

.years {
  @apply text-sm text-muted-foreground;
}

.subtitle {
  @apply mt-5 mb-2 font-semibold;
}

.languages {
  @apply flex flex-col gap-1;
}

.level {
  @apply text-muted-foreground;
}
</style>
