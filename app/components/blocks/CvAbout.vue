<script setup lang="ts">
import CvCard from './CvCard.vue'

defineProps<{ paragraphs: string[] }>()
</script>

<template>
  <CvCard :title="$t('cv.sections.about')">
    <div class="about">
      <p
        v-for="(paragraph, index) in paragraphs"
        :key="index"
      >
        {{ paragraph }}
      </p>
    </div>
  </CvCard>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.about {
  @apply flex flex-col gap-3 leading-relaxed;
}
</style>
