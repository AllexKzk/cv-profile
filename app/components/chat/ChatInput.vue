<script setup lang="ts">
import { ArrowUp, Paperclip } from '@lucide/vue'
import { useTextareaAutosize } from '@vueuse/core'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{
  // The assistant is answering: typing is allowed, sending is not
  busy?: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
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
    @submit.prevent="submit"
  >
    <Textarea
      ref="field"
      v-model="text"
      rows="1"
      class="max-h-52 min-h-0 resize-none border-0 bg-transparent px-1 shadow-none field-sizing-fixed focus-visible:ring-0 dark:bg-transparent"
      :placeholder="$t('chat.input.placeholder')"
      :aria-label="$t('chat.input.placeholder')"
      @keydown.enter="onEnter"
    />
    <div class="toolbar">
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
      <Button
        type="submit"
        size="icon"
        :disabled="!canSend"
        :aria-label="$t('chat.input.send')"
      >
        <ArrowUp />
      </Button>
    </div>
  </form>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.input {
  @apply flex flex-col gap-1 rounded-2xl border border-input bg-background p-2 shadow-xs;
  @apply focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50;
}

.toolbar {
  @apply flex items-center justify-between;
}
</style>
