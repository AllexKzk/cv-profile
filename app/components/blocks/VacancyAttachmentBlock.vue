<script setup lang="ts">
import type { CvDataPart } from '#shared/types/chat'
import AttachmentChip from '~/components/chat/AttachmentChip.vue'

// `data-vacancy` part: the vacancy the user sent with a message
defineProps<{ part: CvDataPart<'vacancy'> }>()
</script>

<template>
  <AttachmentChip
    status="ready"
    :file-name="part.data.fileName"
    :chars="part.data.text.length"
    :truncated="part.data.truncated"
  />
</template>
