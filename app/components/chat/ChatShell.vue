<script setup lang="ts">
const { messages, status, sendMessage } = useCvChat()
const picker = useVacancyPicker()

const isEmpty = computed(() => messages.value.length === 0)
const busy = computed(() => status.value === 'submitted' || status.value === 'streaming')

// The greeting is typed out once per visit, only into an empty chat.
// useState keeps the flag across locale switches and matches between server and client.
const greetingTyped = useState('chat-greeting-typed', () => false)
const animateGreeting = computed(() => !greetingTyped.value && isEmpty.value)

function send(text: string) {
  sendMessage({ text })
}
</script>

<template>
  <div class="chat">
    <ChatMessageList
      :messages="messages"
      :status="status"
    >
      <template #intro>
        <ChatGreeting
          :animate="animateGreeting"
          @typed="greetingTyped = true"
        />
        <ChatQuickActions
          v-if="isEmpty && greetingTyped"
          class="cards"
        />
      </template>
    </ChatMessageList>
    <div class="composer">
      <ChatQuickActions
        v-if="!isEmpty"
        compact
      />
      <ChatInput
        :busy="busy"
        @send="send"
        @attach="picker.open()"
      />
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.chat {
  @apply flex min-h-0 flex-1 flex-col;
}

.cards {
  @apply animate-in fade-in slide-in-from-bottom-2 duration-300;
}

.composer {
  @apply flex shrink-0 flex-col gap-2 pb-4;
}
</style>
