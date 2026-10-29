<script setup lang="ts">
import type { CvDataPart } from '#shared/types/chat'
import DownloadCard from './DownloadCard.vue'

// `data-download` part: the PDF of the current locale
defineProps<{ part: CvDataPart<'download'> }>()

const cv = useCv()
</script>

<template>
  <DownloadCard
    :href="cv.pdf"
    :updated-at="cv.updatedAt"
  />
</template>
