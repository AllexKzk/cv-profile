<script setup lang="ts">
import { CircleAlert, RotateCw } from '@lucide/vue'
import { chatErrorCode } from '~/lib/chat-error'

const props = defineProps<{ error: Error }>()
const emit = defineEmits<{ retry: [] }>()

const code = computed(() => chatErrorCode(props.error))
// Limits for the day: retrying will not help, offer the CV and a direct contact instead
const exhausted = computed(() => code.value === 'ip_budget' || code.value === 'daily_limit')
// A broken request will fail the same way again
const retryable = computed(() => !exhausted.value && code.value !== 'invalid' && code.value !== 'forbidden')

const cv = useCv()
const { downloadCv } = useLocalScenarios()
</script>

<template>
  <div
    class="error"
    role="alert"
  >
    <CircleAlert class="icon" />
    <p class="text">
      {{ $t(`chat.error.${code}`) }}
    </p>
    <div class="actions">
      <Button
        v-if="retryable"
        variant="outline"
        size="sm"
        @click="emit('retry')"
      >
        <RotateCw />
        {{ $t('chat.error.retry') }}
      </Button>
      <template v-if="exhausted">
        <Button
          variant="outline"
          size="sm"
          @click="downloadCv()"
        >
          {{ $t('chat.actions.downloadCv') }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          as="a"
          :href="cv.contacts.telegram"
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram
        </Button>
      </template>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.error {
  @apply flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3;
}

.icon {
  @apply size-4 shrink-0 text-destructive;
}

.text {
  @apply flex-1 text-sm;
}

.actions {
  @apply flex flex-wrap gap-2;
}
</style>
