<script setup lang="ts">
import type { CvMessagePart } from '#shared/types/chat'
import { resolveBlock } from '~/lib/block-registry'

const props = defineProps<{ part: CvMessagePart }>()

const block = computed(() => resolveBlock(props.part.type))
</script>

<template>
  <component
    :is="block"
    v-if="block"
    :part="part"
  />
</template>
