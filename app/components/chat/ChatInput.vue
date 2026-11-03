<script setup lang="ts">
import { Paperclip, SendHorizontal, Square } from '@lucide/vue'
import { CHAT_LIMITS } from '#shared/chat/history'
import { useTextareaAutosize } from '@vueuse/core'
import { Textarea } from '@/components/ui/textarea'
import type { VacancyAttachment } from '~/composables/useVacancyUpload'
import AttachmentChip from './AttachmentChip.vue'

const props = defineProps<{
  // The assistant is answering: typing is allowed, sending is not
  busy?: boolean
  // A vacancy waiting to be sent with the message
  attachment?: VacancyAttachment | null
}>()

const emit = defineEmits<{
  send: [text: string]
  stop: []
  attach: []
  removeAttachment: []
  // Pasted text longer than a message: it becomes a vacancy attachment instead of being cut
  pasteLong: [text: string]
}>()

const text = ref('')
const field = useTemplateRef<InstanceType<typeof Textarea>>('field')
const element = computed(() => field.value?.$el as HTMLTextAreaElement | undefined)

useTextareaAutosize({ element, input: text })

// An attachment alone is a message; one still uploading or failed blocks sending
const attachmentReady = computed(() => props.attachment?.status === 'ready')
const canSend = computed(() => !props.busy && !(props.attachment && !attachmentReady.value)
  && (text.value.trim().length > 0 || attachmentReady.value))

function submit() {
  if (!canSend.value) return
  emit('send', text.value.trim())
  text.value = ''
  element.value?.focus()
}

function onPaste(event: ClipboardEvent) {
  const pasted = event.clipboardData?.getData('text/plain') ?? ''
  if (pasted.length <= CHAT_LIMITS.messageChars) return
  event.preventDefault()
  emit('pasteLong', pasted)
}

function onEnter(event: KeyboardEvent) {
  // Shift+Enter is a line break; Enter while an IME composes text confirms the composition
  if (event.shiftKey || event.isComposing) return
  event.preventDefault()
  submit()
}
</script>

<template>
  <form
    class="input"
    @submit.prevent="submit"
  >
    <AttachmentChip
      v-if="attachment"
      :status="attachment.status"
      :file-name="attachment.status === 'ready' ? attachment.data.fileName : attachment.fileName"
      :chars="attachment.status === 'ready' ? attachment.data.text.length : undefined"
      :truncated="attachment.status === 'ready' ? attachment.data.truncated : undefined"
      :error="attachment.status === 'error' ? attachment.error : undefined"
      removable
      @remove="emit('removeAttachment')"
    />
    <div class="row">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :aria-label="$t('chat.input.attach')"
            @click="emit('attach')"
          >
            <Paperclip />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ $t('chat.input.attach') }}</TooltipContent>
      </Tooltip>
      <Textarea
        ref="field"
        v-model="text"
        rows="1"
        :maxlength="CHAT_LIMITS.messageChars"
        class="max-h-52 min-h-9 min-w-0 flex-1 resize-none placeholder:truncate border-0 bg-transparent px-1 py-2 shadow-none field-sizing-fixed focus-visible:ring-0 dark:bg-transparent"
        :placeholder="$t('chat.input.placeholder')"
        :aria-label="$t('chat.input.placeholder')"
        @keydown.enter="onEnter"
        @paste="onPaste"
      />
      <Button
        v-if="busy"
        type="button"
        size="icon"
        class="stop"
        :aria-label="$t('chat.input.stop')"
        @click="emit('stop')"
      >
        <Square class="fill-current" />
      </Button>
      <Button
        v-else
        type="submit"
        variant="ghost"
        size="icon"
        :disabled="!canSend"
        :aria-label="$t('chat.input.send')"
      >
        <SendHorizontal />
      </Button>
    </div>
  </form>
</template>

<style scoped>
@reference "~/assets/css/main.css";

/* A pending attachment on top, then one row with the controls */
.input {
  @apply flex flex-col gap-1 rounded-2xl border border-input bg-background p-1.5 shadow-xs;
  @apply focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50;
}

/* Attach, the field, send. The field grows upwards, the buttons stay on its last line */
.row {
  @apply flex items-end gap-1;
}
</style>
