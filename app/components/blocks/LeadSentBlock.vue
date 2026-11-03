<script setup lang="ts">
import { CircleCheck } from '@lucide/vue'
import type { CvDataPart } from '#shared/types/chat'

// Confirmation that a lead reached the candidate (`data-lead`, added locally after POST /api/lead)
defineProps<{ part: CvDataPart<'lead'> }>()
</script>

<template>
  <p class="lead-sent">
    <CircleCheck class="icon" />
    {{ $t('lead.sent') }}
  </p>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.lead-sent {
  @apply flex items-start gap-2;
}

.icon {
  @apply mt-0.5 size-4 shrink-0 text-primary;
}
</style>
