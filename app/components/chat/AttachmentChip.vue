<script setup lang="ts">
import { CircleAlert, ClipboardPaste, FileText, LoaderCircle, X } from '@lucide/vue'
import type { VacancyUploadError } from '~/composables/useVacancyUpload'

// A vacancy attachment: in the input (removable, with upload states) and in a sent message
const props = defineProps<{
  status: 'loading' | 'ready' | 'error'
  // File name; empty for pasted text
  fileName?: string
  chars?: number
  truncated?: boolean
  error?: VacancyUploadError
  removable?: boolean
}>()

const emit = defineEmits<{ remove: [] }>()

const { t, locale } = useI18n()

const name = computed(() => props.fileName || t('vacancy.pasted'))
const icon = computed(() => {
  if (props.status === 'loading') return LoaderCircle
  if (props.status === 'error') return CircleAlert
  return props.fileName ? FileText : ClipboardPaste
})
const details = computed(() => {
  if (props.status === 'loading') return t('vacancy.loading')
  if (props.status === 'error') return t(`vacancy.error.${props.error ?? 'network'}`)
  const count = props.chars ?? 0
  const chars = t('vacancy.chars', { n: count.toLocaleString(locale.value) }, count)
  return props.truncated ? `${chars} · ${t('vacancy.truncated')}` : chars
})
</script>

<template>
  <div
    class="chip"
    :class="status"
    :role="status === 'error' ? 'alert' : undefined"
  >
    <component
      :is="icon"
      class="icon"
    />
    <div class="info">
      <p class="name">
        {{ name }}
      </p>
      <p class="details">
        {{ details }}
      </p>
    </div>
    <Button
      v-if="removable"
      type="button"
      variant="ghost"
      size="icon-sm"
      :aria-label="$t('vacancy.remove')"
      @click="emit('remove')"
    >
      <X />
    </Button>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.chip {
  @apply flex max-w-full items-center gap-2.5 self-start rounded-lg border bg-background py-1.5 pr-1.5 pl-2.5 sm:max-w-sm;
}

.icon {
  @apply size-5 shrink-0 text-muted-foreground;
}

.loading .icon {
  @apply animate-spin motion-reduce:animate-none;
}

.error {
  @apply border-destructive/50;
}

.error .icon,
.error .details {
  @apply text-destructive;
}

.info {
  @apply min-w-0 flex-1;
}

.name {
  @apply truncate text-sm font-medium;
}

.details {
  @apply text-xs text-muted-foreground;
}
</style>
