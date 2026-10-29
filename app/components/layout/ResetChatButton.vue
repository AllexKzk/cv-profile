<script setup lang="ts">
import { RotateCcw } from '@lucide/vue'

const { messages, stop } = useCvChat()

// The persistence watcher in plugins/chat.ts removes the stored history once the list is empty
async function resetChat() {
  await stop()
  messages.value = []
}
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        :disabled="messages.length === 0"
        :aria-label="$t('topbar.resetChat')"
        @click="resetChat"
      >
        <RotateCcw />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{{ $t('topbar.resetChat') }}</TooltipContent>
  </Tooltip>
</template>
