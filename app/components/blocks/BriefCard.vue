<script setup lang="ts">
import { Check, CircleCheck, Send, X } from '@lucide/vue'
import type { CvToolPart } from '#shared/types/chat'
import { formatSalary } from '~/lib/interview'
import CvCard from './CvCard.vue'
import LeadDialog from './LeadDialog.vue'

// The brief collected by the interview (server tool `submitBrief`) with its quick fit and the lead CTA
const props = defineProps<{ part: CvToolPart<'submitBrief'> }>()

const { t, locale } = useI18n()
const { messages } = useCvChat()

const result = computed(() => (props.part.state === 'output-available' ? props.part.output : undefined))

// A lead sent from this card leaves a `data-lead` part pointing at it
const sent = computed(() => messages.value.some(message =>
  message.parts.some(part => part.type === 'data-lead' && part.data.source === props.part.toolCallId)))

const rows = computed(() => {
  const brief = result.value?.brief
  if (!brief) return []
  const missing = t('brief.notSpecified')
  const format = brief.format?.length ? brief.format.map(value => t(`interview.options.format.${value}`)).join(', ') : undefined
  return [
    { key: 'format', value: format ?? missing },
    { key: 'location', value: brief.location },
    { key: 'domain', value: brief.domain },
    { key: 'employment', value: brief.employment },
    { key: 'salary', value: brief.salary ? formatSalary(brief.salary, t, locale.value) : undefined },
    { key: 'start', value: brief.start },
    { key: 'company', value: brief.company },
    { key: 'notes', value: brief.notes },
  ].filter((row): row is { key: string, value: string } => Boolean(row.value))
})

const stacks = computed(() => {
  const fit = result.value?.fit
  if (!fit) return []
  return [
    { key: 'mustHave', items: fit.mustHave },
    { key: 'niceToHave', items: fit.niceToHave },
  ].filter(stack => stack.key === 'mustHave' || stack.items.length)
})

const role = computed(() => {
  const brief = result.value?.brief
  return [brief?.seniority, brief?.role].filter(Boolean).join(' · ') || t('brief.notSpecified')
})

const matched = computed(() => result.value?.fit.mustHave.filter(skill => skill.inCv).length ?? 0)
</script>

<template>
  <CvCard
    v-if="result"
    :title="$t('brief.title')"
  >
    <div class="brief">
      <dl class="rows">
        <div class="row">
          <dt class="label">
            {{ $t('brief.fields.role') }}
          </dt>
          <dd class="value">
            {{ role }}
          </dd>
        </div>

        <div
          v-for="stack in stacks"
          :key="stack.key"
          class="row"
        >
          <dt class="label">
            {{ $t(`brief.fields.${stack.key}`) }}
          </dt>
          <dd
            v-if="stack.items.length"
            class="skills"
          >
            <Badge
              v-for="skill in stack.items"
              :key="skill.name"
              :variant="skill.inCv ? 'default' : 'outline'"
              :title="$t(skill.inCv ? 'brief.inCv' : 'brief.notInCv')"
            >
              <Check v-if="skill.inCv" />
              <X v-else />
              {{ skill.name }}
            </Badge>
          </dd>
          <dd
            v-else
            class="value"
          >
            {{ $t('brief.notSpecified') }}
          </dd>
        </div>

        <div
          v-for="row in rows"
          :key="row.key"
          class="row"
        >
          <dt class="label">
            {{ $t(`brief.fields.${row.key}`) }}
          </dt>
          <dd class="value">
            {{ row.value }}
            <Badge
              v-if="row.key === 'format' && result.fit.format !== 'unknown'"
              :variant="result.fit.format === 'mismatch' ? 'destructive' : 'secondary'"
            >
              {{ $t(`brief.formatFit.${result.fit.format}`) }}
            </Badge>
          </dd>
        </div>
      </dl>

      <p
        v-if="result.fit.mustHave.length"
        class="summary"
      >
        {{ $t('brief.stackFit', { matched, total: result.fit.mustHave.length }) }}
      </p>

      <div class="actions">
        <p
          v-if="sent"
          class="sent"
        >
          <CircleCheck class="sent-icon" />
          {{ $t('brief.sent') }}
        </p>
        <LeadDialog
          v-else
          :source="part.toolCallId"
          :subject="{ kind: 'brief', brief: result.brief, fit: result.fit }"
        >
          <Button>
            <Send />
            {{ $t('brief.cta') }}
          </Button>
        </LeadDialog>
      </div>
    </div>
  </CvCard>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.brief {
  @apply flex flex-col gap-4;
}

.rows {
  @apply flex flex-col gap-2.5;
}

.row {
  @apply grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-3;
}

.label {
  @apply text-sm text-muted-foreground;
}

.value {
  @apply flex flex-wrap items-center gap-2 text-sm;
}

.skills {
  @apply flex flex-wrap gap-1.5;
}

.summary {
  @apply text-sm text-muted-foreground;
}

.actions {
  @apply flex flex-wrap items-center gap-2 border-t pt-4;
}

.sent {
  @apply flex items-center gap-2 text-sm font-medium;
}

.sent-icon {
  @apply size-4 text-primary;
}
</style>
