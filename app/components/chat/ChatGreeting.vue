<script setup lang="ts">
// First assistant message. Not part of the chat history: it is neither stored nor sent to the model.
const props = defineProps<{
  // Type the text out instead of showing it at once
  animate?: boolean
}>()

const emit = defineEmits<{ typed: [] }>()

const MS_PER_CHAR = 18

const { t } = useI18n()
const cv = useCv()

const text = computed(() => t('chat.greeting', { name: cv.value.person.name, title: cv.value.person.title }))

// The server renders the whole text (invisible remainder) so the layout does not jump while typing
const typedLength = ref(props.animate ? 0 : Infinity)
const typed = computed(() => text.value.slice(0, typedLength.value))
const rest = computed(() => text.value.slice(typedLength.value))

let timer: ReturnType<typeof setInterval> | undefined

function finish() {
  clearInterval(timer)
  if (typedLength.value === Infinity) return
  typedLength.value = Infinity
  emit('typed')
}

onMounted(() => {
  if (!props.animate) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return finish()
  timer = setInterval(() => {
    typedLength.value++
    if (typedLength.value >= text.value.length) finish()
  }, MS_PER_CHAR)
})

// The conversation started (or history was restored) before typing ended
watch(() => props.animate, (animate) => {
  if (!animate) finish()
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="greeting">
    <p
      class="text"
      :aria-label="text"
    >
      <span aria-hidden="true">{{ typed }}</span><span
        class="rest"
        aria-hidden="true"
      >{{ rest }}</span>
    </p>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.text {
  @apply break-words whitespace-pre-wrap;
}

.rest {
  @apply invisible;
}
</style>
