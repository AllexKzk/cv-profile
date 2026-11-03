<script setup lang="ts">
import { CircleCheck, CircleHelp, CircleMinus, CircleX, LoaderCircle } from '@lucide/vue'
import type { Component } from 'vue'
import { REQUIREMENT_STATUSES } from '#shared/match/schema'
import type { RequirementStatus } from '#shared/match/schema'
import type { CvToolPart } from '#shared/types/chat'
import CvCard from './CvCard.vue'

// `tool-analyzeVacancy` part: the interim match result. F6 replaces it with MatchReport.
const props = defineProps<{ part: CvToolPart<'analyzeVacancy'> }>()

const STATUS_ICONS: Record<RequirementStatus, Component> = {
  match: CircleCheck,
  partial: CircleMinus,
  missing: CircleX,
  unknown: CircleHelp,
}

const analysis = computed(() => props.part.state === 'output-available' ? props.part.output : undefined)
const failed = computed(() => props.part.state === 'output-error')

// Requirements grouped by status, in the order of the counters: matches first
const groups = computed(() => REQUIREMENT_STATUSES
  .map(status => ({ status, items: analysis.value?.requirements.filter(r => r.status === status) ?? [] }))
  .filter(group => group.items.length))
</script>

<template>
  <p
    v-if="failed"
    class="failed"
  >
    {{ $t('vacancy.match.failed') }}
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
    <div class="head">
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
      </div>
      <div
        v-if="analysis.score.percent !== null"
        class="score"
        :class="analysis.score.level"
      >
        <span class="percent">{{ analysis.score.percent }}%</span>
        <span class="level">{{ $t(`vacancy.match.level.${analysis.score.level}`) }}</span>
      </div>
    </div>

    <p
      v-if="analysis.score.percent === null"
      class="note"
    >
      {{ $t('vacancy.match.noScore') }}
    </p>

    <ul class="counts">
      <li
        v-for="status in REQUIREMENT_STATUSES"
        :key="status"
        class="count"
        :class="status"
      >
        <component
          :is="STATUS_ICONS[status]"
          class="icon"
        />
        {{ $t(`vacancy.match.status.${status}`) }}: {{ analysis.score.counts[status] }}
      </li>
    </ul>

    <p
      v-if="analysis.score.mustMissing.length"
      class="gaps"
    >
      {{ $t('vacancy.match.mustMissing', { list: analysis.score.mustMissing.join(', ') }) }}
    </p>

    <ul class="requirements">
      <template
        v-for="group in groups"
        :key="group.status"
      >
        <li
          v-for="requirement in group.items"
          :key="requirement.name"
          class="requirement"
          :class="group.status"
        >
          <component
            :is="STATUS_ICONS[group.status]"
            class="icon"
            :aria-label="$t(`vacancy.match.status.${group.status}`)"
          />
          <div class="text">
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

.head {
  @apply flex items-start justify-between gap-4;
}

.vacancy {
  @apply min-w-0;
}

.title {
  @apply text-base font-semibold;
}

.company {
  @apply text-sm text-muted-foreground;
}

.score {
  @apply flex shrink-0 flex-col items-end;
}

.percent {
  @apply text-3xl leading-none font-bold tabular-nums;
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

.note {
  @apply mt-2 text-sm text-muted-foreground;
}

.counts {
  @apply mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground;
}

.count {
  @apply flex items-center gap-1.5;
}

.gaps {
  @apply mt-3 text-sm text-destructive;
}

.requirements {
  @apply mt-4 flex flex-col gap-2.5 border-t pt-4;
}

.requirement {
  @apply flex items-start gap-2.5;
}

.icon {
  @apply size-4 shrink-0;
}

.requirement .icon {
  @apply mt-0.5;
}

.match .icon {
  @apply text-success;
}

.partial .icon {
  @apply text-warning;
}

.missing .icon {
  @apply text-destructive;
}

.unknown .icon {
  @apply text-muted-foreground;
}

.text {
  @apply min-w-0;
}

.name {
  @apply flex flex-wrap items-center gap-2 text-sm font-medium;
}

.evidence {
  @apply text-sm text-muted-foreground;
}
</style>
