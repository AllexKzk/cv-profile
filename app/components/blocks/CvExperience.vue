<script setup lang="ts">
import type { CvExperience } from '#shared/cv'
import CvJob from './CvJob.vue'

// Experience is a heading and one card per job, so a single job can be shown on its own
defineProps<{ items: CvExperience[] }>()
</script>

<template>
  <section class="experience">
    <h3 class="heading">
      {{ $t('cv.sections.experience') }}
    </h3>
    <ol class="jobs">
      <li
        v-for="job in items"
        :key="job.id"
      >
        <CvJob :job="job" />
      </li>
    </ol>
  </section>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.experience {
  @apply flex flex-col gap-3;
}

.heading {
  @apply text-base font-semibold;
}

.jobs {
  @apply flex flex-col gap-3;
}
</style>
