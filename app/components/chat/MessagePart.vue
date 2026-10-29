<script setup lang="ts">
import type { CvMessagePart, CvUIMessage } from '#shared/types/chat'
import { resolveBlock } from '~/lib/block-registry'

const props = defineProps<{ part: CvMessagePart, role: CvUIMessage['role'] }>()

const block = computed(() => resolveBlock(props.part.type, props.role))
</script>

<template>
  <component
    :is="block"
    v-if="block"
    :part="part"
  />
</template>
