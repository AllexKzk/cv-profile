<script setup lang="ts">
import { ArrowUp, Paperclip, Square } from '@lucide/vue'
import { CHAT_LIMITS } from '#shared/chat/history'
import { useTextareaAutosize } from '@vueuse/core'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{
  // The assistant is answering: typing is allowed, sending is not
  busy?: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
  stop: []
  attach: []
}>()

const text = ref('')
const field = useTemplateRef<InstanceType<typeof Textarea>>('field')
const element = computed(() => field.value?.$el as HTMLTextAreaElement | undefined)

useTextareaAutosize({ element, input: text })

const canSend = computed(() => !props.busy && text.value.trim().length > 0)

function submit() {
  if (!canSend.value) return
  emit('send', text.value.trim())
  text.value = ''
  element.value?.focus()
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
    data-glass
    @submit.prevent="submit"
  >
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
      size="icon"
      :disabled="!canSend"
      :aria-label="$t('chat.input.send')"
    >
      <ArrowUp />
    </Button>
  </form>
</template>

<style scoped>
@reference "~/assets/css/main.css";

/* One row: attach, the field, send. The field grows upwards, the buttons stay on its last line.
   Messages scroll under it: the shader frosts only the background, so the page text behind
   needs a real blur */
.input {
  @apply flex items-end gap-1 rounded-2xl glass p-1.5 backdrop-blur-xl;
  @apply focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50;
}
</style>
