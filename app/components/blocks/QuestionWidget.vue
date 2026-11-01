<script setup lang="ts">
import { Check, Plus } from '@lucide/vue'
import { CURRENCIES, SALARY_PERIODS, SLOT_CONFIG } from '#shared/interview/brief'
import type { QuestionAnswer } from '#shared/interview/brief'
import type { CvToolPart } from '#shared/types/chat'
import { Input } from '@/components/ui/input'
import { formatAnswer, questionOptions } from '~/lib/interview'

// A question of the interview (client tool `askQuestion`). It waits for a click or typed text;
// the answer becomes the tool output, and the chat sends the round when all of it is answered.
const props = defineProps<{ part: CvToolPart<'askQuestion'> }>()

const { t, locale } = useI18n()
const { addToolOutput } = useCvChat()

const input = computed(() => (props.part.state === 'input-streaming' ? undefined : props.part.input))
const config = computed(() => (input.value ? SLOT_CONFIG[input.value.slot] : undefined))
const options = computed(() => (input.value ? questionOptions(input.value, t) : []))
const waiting = computed(() => props.part.state === 'input-available')

const answer = computed(() => {
  if (props.part.state === 'output-available') return formatAnswer(props.part.output, t, locale.value)
  if (props.part.state === 'output-error') return t('interview.skipped')
  return undefined
})

function reply(output: QuestionAnswer) {
  if (!waiting.value) return
  addToolOutput({ tool: 'askQuestion', toolCallId: props.part.toolCallId, output })
}

// Multi-select: options and own values picked so far
const picked = ref<string[]>([])
const extra = ref<string[]>([])
const allOptions = computed(() => [...options.value, ...extra.value])

function toggle(value: string) {
  picked.value = picked.value.includes(value) ? picked.value.filter(v => v !== value) : [...picked.value, value]
}

// Own answer: picks it at once for a single choice, adds it to the list for a multi-select
const custom = ref('')
function addCustom() {
  const value = custom.value.trim()
  if (!value) return
  custom.value = ''
  if (config.value?.widget === 'single') return reply({ kind: 'options', values: [value] })
  if (!allOptions.value.includes(value)) extra.value = [...extra.value, value]
  if (!picked.value.includes(value)) picked.value = [...picked.value, value]
}

// Salary range: either bound is enough
const min = ref<number | undefined>()
const max = ref<number | undefined>()
const currency = ref<typeof CURRENCIES[number]>(locale.value === 'ru' ? 'RUB' : 'USD')
const period = ref<typeof SALARY_PERIODS[number]>('month')
const amount = (value: number | string | undefined) => {
  const number = Number(value)
  return value === '' || value === undefined || !Number.isFinite(number) || number < 0 ? undefined : number
}
const hasRange = computed(() => amount(min.value) !== undefined || amount(max.value) !== undefined)

const text = ref('')

function done() {
  const widget = config.value?.widget
  if (widget === 'multi' && picked.value.length) return reply({ kind: 'options', values: picked.value })
  if (widget === 'range' && hasRange.value) {
    return reply({ kind: 'range', min: amount(min.value), max: amount(max.value), currency: currency.value, period: period.value })
  }
  if (widget === 'text' && text.value.trim()) return reply({ kind: 'text', text: text.value.trim() })
}
</script>

<template>
  <section
    v-if="input && config"
    class="question"
    :class="{ answered: !waiting }"
    :data-slot="input.slot"
  >
    <p class="title">
      {{ input.question }}
    </p>

    <p
      v-if="answer"
      class="answer"
    >
      <Check class="answer-icon" />
      {{ answer }}
    </p>

    <template v-else>
      <div
        v-if="config.widget === 'single' || config.widget === 'multi'"
        class="options"
      >
        <Button
          v-for="option in (config.widget === 'multi' ? allOptions : options)"
          :key="option"
          type="button"
          size="sm"
          :variant="picked.includes(option) ? 'default' : 'outline'"
          :aria-pressed="config.widget === 'multi' ? picked.includes(option) : undefined"
          class="option"
          @click="config.widget === 'multi' ? toggle(option) : reply({ kind: 'options', values: [option] })"
        >
          {{ option }}
        </Button>
      </div>

      <form
        v-if="config.custom"
        class="row"
        @submit.prevent="addCustom"
      >
        <Input
          v-model="custom"
          :maxlength="100"
          :placeholder="$t('interview.custom')"
          :aria-label="$t('interview.custom')"
          class="field"
        />
        <Button
          type="submit"
          size="icon-sm"
          variant="outline"
          :disabled="!custom.trim()"
          :aria-label="$t('interview.add')"
        >
          <Plus />
        </Button>
      </form>

      <div
        v-if="config.widget === 'range'"
        class="range"
      >
        <div class="row">
          <Input
            v-model.number="min"
            type="number"
            inputmode="numeric"
            min="0"
            :placeholder="$t('interview.salary.min')"
            :aria-label="$t('interview.salary.min')"
            class="field"
          />
          <Input
            v-model.number="max"
            type="number"
            inputmode="numeric"
            min="0"
            :placeholder="$t('interview.salary.max')"
            :aria-label="$t('interview.salary.max')"
            class="field"
          />
        </div>
        <div class="options">
          <Button
            v-for="code in CURRENCIES"
            :key="code"
            type="button"
            size="xs"
            :variant="currency === code ? 'default' : 'outline'"
            :aria-pressed="currency === code"
            @click="currency = code"
          >
            {{ code }}
          </Button>
          <span class="divider" />
          <Button
            v-for="value in SALARY_PERIODS"
            :key="value"
            type="button"
            size="xs"
            :variant="period === value ? 'default' : 'outline'"
            :aria-pressed="period === value"
            @click="period = value"
          >
            {{ $t(`interview.salary.period.${value}`) }}
          </Button>
        </div>
      </div>

      <Input
        v-if="config.widget === 'text'"
        v-model="text"
        :maxlength="200"
        :placeholder="$t('interview.textPlaceholder')"
        :aria-label="input.question"
        @keydown.enter.prevent="done"
      />

      <div class="footer">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          class="skip"
          @click="reply({ kind: 'skipped' })"
        >
          {{ $t('interview.skip') }}
        </Button>
        <Button
          v-if="config.widget !== 'single'"
          type="button"
          size="sm"
          :disabled="config.widget === 'multi' ? !picked.length : config.widget === 'range' ? !hasRange : !text.trim()"
          class="done"
          @click="done"
        >
          {{ $t('interview.done') }}
        </Button>
      </div>
    </template>
  </section>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.question {
  @apply flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground;
}

.question.answered {
  @apply gap-1 border-dashed bg-transparent py-3;
}

.title {
  @apply font-medium;
}

.answered .title {
  @apply text-sm text-muted-foreground;
}

.answer {
  @apply flex items-start gap-2;
}

.answer-icon {
  @apply mt-0.5 size-4 shrink-0 text-primary;
}

.options {
  @apply flex flex-wrap items-center gap-2;
}

.option {
  @apply rounded-full;
}

.range {
  @apply flex flex-col gap-2;
}

.row {
  @apply flex items-center gap-2;
}

.field {
  @apply h-8 min-w-0 flex-1;
}

.divider {
  @apply mx-1 h-4 w-px bg-border;
}

.footer {
  @apply flex items-center justify-end gap-2;
}

.skip {
  @apply text-muted-foreground;
}
</style>
