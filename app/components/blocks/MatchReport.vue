<script setup lang="ts">
import { ChevronDown, CircleCheck, CircleHelp, CircleMinus, CircleX, LoaderCircle, Send } from '@lucide/vue'
import type { Component } from 'vue'
import type { LeadSubject } from '#shared/lead'
import { matchLevel } from '#shared/match/match-score'
import { applyPriorities, clarificationCandidates, PRIORITIES, reportHighlights, scoreWithPriorities } from '#shared/match/report'
import type { Priority } from '#shared/match/report'
import { REQUIREMENT_CATEGORIES, REQUIREMENT_STATUSES } from '#shared/match/schema'
import type { RequirementStatus } from '#shared/match/schema'
import type { CvToolPart } from '#shared/types/chat'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import CvCard from './CvCard.vue'
import LeadDialog from './LeadDialog.vue'

// `tool-analyzeVacancy` part: the match report. The visitor's clarifications recompute the score
// here, by code, without asking the model again.
const props = defineProps<{ part: CvToolPart<'analyzeVacancy'> }>()

const STATUS_ICONS: Record<RequirementStatus, Component> = {
  match: CircleCheck,
  partial: CircleMinus,
  missing: CircleX,
  unknown: CircleHelp,
}

const { messages } = useCvChat()
const priorities = useMatchPriorities(() => props.part.toolCallId)

const analysis = computed(() => props.part.state === 'output-available' ? props.part.output : undefined)
const failed = computed(() => props.part.state === 'output-error')
// No result and the message no longer streams: the answer was stopped or broke off mid-call
const interrupted = computed(() => !analysis.value && !failed.value && !priorities.busy.value)

const requirements = computed(() => applyPriorities(analysis.value?.requirements ?? [], priorities.values.value))
const score = computed(() => scoreWithPriorities(analysis.value?.requirements ?? [], priorities.values.value))
const clarifications = computed(() => clarificationCandidates(analysis.value?.requirements ?? []))
const clarified = computed(() => Object.keys(priorities.values.value).length > 0)
const highlights = computed(() => reportHighlights(requirements.value))
const mustCount = computed(() => analysis.value?.requirements.filter(r => r.importance === 'must').length ?? 0)

const categories = computed(() => [...score.value.byCategory]
  .sort((a, b) => REQUIREMENT_CATEGORIES.indexOf(a.category) - REQUIREMENT_CATEGORIES.indexOf(b.category))
  .map(item => ({ ...item, level: matchLevel(item.percent) })))

// All requirements grouped by status, matches first
const groups = computed(() => REQUIREMENT_STATUSES
  .map(status => ({ status, items: requirements.value.filter(r => r.status === status) }))
  .filter(group => group.items.length))

const priorityOf = (name: string): Priority => priorities.values.value[name] ?? 'must'

function choose(name: string, value: unknown) {
  // A toggle group can be unselected by a second click: keep the current answer then
  if (typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value)) priorities.set(name, value as Priority)
}

// A lead sent from this report leaves a `data-lead` part pointing at it
const sent = computed(() => messages.value.some(message =>
  message.parts.some(part => part.type === 'data-lead' && part.data.source === props.part.toolCallId)))

// Without evidence and percentage: the server recomputes the score from this
const subject = computed((): LeadSubject | undefined => analysis.value && {
  kind: 'report',
  title: analysis.value.title,
  company: analysis.value.company,
  requirements: analysis.value.requirements.map(({ name, category, importance, status }) => ({ name, category, importance, status })),
  priorities: priorities.values.value,
})
</script>

<template>
  <p
    v-if="failed"
    class="failed"
  >
    {{ $t('vacancy.match.failed') }}
  </p>
  <p
    v-else-if="interrupted"
    class="failed"
  >
    {{ $t('vacancy.match.interrupted') }}
  </p>
  <CvCard v-else-if="!analysis">
    <p
      class="pending"
      role="status"
    >
      <LoaderCircle class="spinner" />
      {{ $t('vacancy.match.analyzing') }}
    </p>
  </CvCard>
  <CvCard v-else>
    <div class="report">
      <header class="head">
        <div class="vacancy">
          <h3 class="title">
            {{ analysis.title }}
          </h3>
          <p
            v-if="analysis.company"
            class="company"
          >
            {{ analysis.company }}
          </p>
          <p class="basis">
            {{ $t('vacancy.report.basis', { total: analysis.requirements.length, must: mustCount }) }}
          </p>
        </div>
        <div
          v-if="score.percent !== null"
          class="score"
          :class="score.level"
          aria-live="polite"
        >
          <span class="percent">{{ score.percent }}%</span>
          <span class="level">{{ $t(`vacancy.match.level.${score.level}`) }}</span>
        </div>
      </header>

      <p
        v-if="score.percent === null"
        class="note"
      >
        {{ $t('vacancy.match.noScore') }}
      </p>
      <p
        v-if="clarified"
        class="clarified"
      >
        {{ $t('vacancy.report.clarified') }} ·
        <button
          type="button"
          class="reset"
          :disabled="priorities.busy.value"
          @click="priorities.reset()"
        >
          {{ $t('vacancy.report.reset') }}
        </button>
      </p>

      <section
        v-if="clarifications.length"
        class="section clarify"
      >
        <h4 class="section-title">
          {{ $t('vacancy.report.clarify.title') }}
        </h4>
        <p class="hint">
          {{ $t('vacancy.report.clarify.hint') }}
        </p>
        <ul class="clarify-list">
          <li
            v-for="item in clarifications"
            :key="item.name"
            class="clarify-item"
          >
            <div class="clarify-text">
              <p class="name">
                <component
                  :is="STATUS_ICONS[item.status]"
                  class="icon"
                  :class="item.status"
                  :aria-label="$t(`vacancy.match.status.${item.status}`)"
                />
                {{ item.name }}
              </p>
              <p
                v-if="item.evidence"
                class="evidence"
              >
                {{ item.evidence }}
              </p>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              class="priority"
              :model-value="priorityOf(item.name)"
              :disabled="priorities.busy.value"
              :aria-label="$t('vacancy.report.clarify.label', { name: item.name })"
              @update:model-value="choose(item.name, $event)"
            >
              <ToggleGroupItem
                v-for="value in PRIORITIES"
                :key="value"
                :value="value"
                class="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {{ $t(`vacancy.report.priority.${value}`) }}
              </ToggleGroupItem>
            </ToggleGroup>
          </li>
        </ul>
      </section>

      <section
        v-if="categories.length"
        class="section"
      >
        <h4 class="section-title">
          {{ $t('vacancy.report.categories') }}
        </h4>
        <ul class="categories">
          <li
            v-for="item in categories"
            :key="item.category"
            class="category"
            :class="item.level"
          >
            <span class="category-name">{{ $t(`vacancy.report.category.${item.category}`) }}</span>
            <span
              class="bar"
              role="meter"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="item.percent"
              :aria-label="$t(`vacancy.report.category.${item.category}`)"
            >
              <span
                class="bar-fill"
                :style="{ width: `${item.percent}%` }"
              />
            </span>
            <span class="category-value">{{ item.percent }}%</span>
          </li>
        </ul>
      </section>

      <div class="highlights">
        <section class="section">
          <h4 class="section-title">
            {{ $t('vacancy.report.strengths') }}
          </h4>
          <ul
            v-if="highlights.strengths.length"
            class="points"
          >
            <li
              v-for="item in highlights.strengths"
              :key="item.name"
              class="point"
            >
              <CircleCheck class="icon match" />
              <div class="point-text">
                <p class="name">
                  {{ item.name }}
                </p>
                <p
                  v-if="item.evidence"
                  class="evidence"
                >
                  {{ item.evidence }}
                </p>
              </div>
            </li>
          </ul>
          <p
            v-else
            class="empty"
          >
            {{ $t('vacancy.report.noStrengths') }}
          </p>
        </section>

        <section class="section">
          <h4 class="section-title">
            {{ $t('vacancy.report.risks') }}
          </h4>
          <ul
            v-if="highlights.risks.length"
            class="points"
          >
            <li
              v-for="item in highlights.risks"
              :key="item.name"
              class="point"
            >
              <component
                :is="STATUS_ICONS[item.status]"
                class="icon"
                :class="item.status"
                :aria-label="$t(`vacancy.match.status.${item.status}`)"
              />
              <div class="point-text">
                <p class="name">
                  {{ item.name }}
                </p>
                <p
                  v-if="item.status === 'unknown'"
                  class="evidence"
                >
                  {{ $t('vacancy.report.askAtInterview') }}
                </p>
                <p
                  v-else-if="item.evidence"
                  class="evidence"
                >
                  {{ item.evidence }}
                </p>
              </div>
            </li>
          </ul>
          <p
            v-else
            class="empty"
          >
            {{ $t('vacancy.report.noRisks') }}
          </p>
          <p
            v-if="highlights.moreRisks"
            class="more"
          >
            {{ $t('vacancy.report.moreRisks', { n: highlights.moreRisks }) }}
          </p>
        </section>
      </div>

      <Collapsible
        v-slot="{ open }"
        class="all"
      >
        <CollapsibleTrigger as-child>
          <Button
            variant="ghost"
            size="sm"
            class="-ml-2"
          >
            <ChevronDown
              class="chevron"
              :class="{ open }"
            />
            {{ $t('vacancy.report.all', { n: requirements.length }) }}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul class="requirements">
            <template
              v-for="group in groups"
              :key="group.status"
            >
              <li
                v-for="requirement in group.items"
                :key="requirement.name"
                class="point"
              >
                <component
                  :is="STATUS_ICONS[group.status]"
                  class="icon"
                  :class="group.status"
                  :aria-label="$t(`vacancy.match.status.${group.status}`)"
                />
                <div class="point-text">
                  <p class="name">
                    {{ requirement.name }}
                    <Badge :variant="requirement.importance === 'must' ? 'secondary' : 'outline'">
                      {{ $t(`vacancy.match.importance.${requirement.importance}`) }}
                    </Badge>
                  </p>
                  <p
                    v-if="requirement.evidence"
                    class="evidence"
                  >
                    {{ requirement.evidence }}
                  </p>
                </div>
              </li>
            </template>
          </ul>
        </CollapsibleContent>
      </Collapsible>

      <footer class="actions">
        <p
          v-if="sent"
          class="sent"
        >
          <CircleCheck class="icon match" />
          {{ $t('vacancy.report.sent') }}
        </p>
        <LeadDialog
          v-else-if="subject"
          :source="part.toolCallId"
          :subject="subject"
        >
          <Button>
            <Send />
            {{ $t('vacancy.report.cta') }}
          </Button>
        </LeadDialog>
      </footer>
    </div>
  </CvCard>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.failed {
  @apply text-sm text-muted-foreground;
}

.pending {
  @apply flex items-center gap-2 text-sm text-muted-foreground;
}

.spinner {
  @apply size-4 animate-spin motion-reduce:animate-none;
}

.report {
  @apply flex flex-col gap-5;
}

.head {
  @apply flex items-start justify-between gap-4;
}

.vacancy {
  @apply min-w-0;
}

.title {
  @apply text-base font-semibold;
}

.company,
.basis {
  @apply text-sm text-muted-foreground;
}

.basis {
  @apply mt-1 text-xs;
}

.score {
  @apply flex shrink-0 flex-col items-end;
}

.percent {
  @apply text-4xl leading-none font-bold tabular-nums;
}

.level {
  @apply mt-1 text-xs font-medium text-muted-foreground;
}

.strong .percent,
.good .percent {
  @apply text-success;
}

.partial .percent {
  @apply text-warning;
}

.weak .percent {
  @apply text-destructive;
}

.note,
.clarified {
  @apply -mt-3 text-sm text-muted-foreground;
}

.reset {
  @apply underline underline-offset-4 hover:text-foreground disabled:opacity-50;
}

.section {
  @apply flex flex-col gap-2;
}

.section-title {
  @apply text-sm font-semibold;
}

.hint,
.empty,
.more {
  @apply text-sm text-muted-foreground;
}

.clarify {
  @apply rounded-lg bg-muted/50 p-3 sm:p-4;
}

.clarify-list {
  @apply mt-1 flex flex-col gap-3;
}

.clarify-item {
  @apply flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4;
}

.clarify-text {
  @apply min-w-0;
}

.priority {
  @apply shrink-0 bg-background;
}

.categories {
  @apply flex flex-col gap-2;
}

.category {
  @apply grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm;
}

.category-name {
  @apply truncate text-muted-foreground;
}

.bar {
  @apply h-2 overflow-hidden rounded-full bg-muted;
}

.bar-fill {
  @apply block h-full rounded-full bg-success transition-[width] duration-300 motion-reduce:transition-none;
}

.partial .bar-fill {
  @apply bg-warning;
}

.weak .bar-fill {
  @apply bg-destructive;
}

.category-value {
  @apply text-right tabular-nums;
}

.highlights {
  @apply grid gap-5 sm:grid-cols-2;
}

.points,
.requirements {
  @apply flex flex-col gap-2.5;
}

.requirements {
  @apply mt-2;
}

.point {
  @apply flex items-start gap-2;
}

.point-text {
  @apply min-w-0;
}

.name {
  @apply flex flex-wrap items-center gap-2 text-sm font-medium;
}

.evidence {
  @apply text-sm text-muted-foreground;
}

.icon {
  @apply mt-0.5 size-4 shrink-0;
}

.clarify-text .icon {
  @apply mt-0;
}

.icon.match {
  @apply text-success;
}

.icon.partial {
  @apply text-warning;
}

.icon.missing {
  @apply text-destructive;
}

.icon.unknown {
  @apply text-muted-foreground;
}

.chevron {
  @apply transition-transform motion-reduce:transition-none;
}

.chevron.open {
  @apply rotate-180;
}

.actions {
  @apply flex flex-wrap items-center gap-3 border-t pt-4;
}

.sent {
  @apply flex items-center gap-2 text-sm;
}

.sent .icon {
  @apply mt-0;
}
</style>
