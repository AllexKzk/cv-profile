<script setup lang="ts">
import { formatDuration, formatYearMonth, monthsBetween } from '#shared/cv'
import type { CvExperience } from '#shared/cv'
import CvCard from './CvCard.vue'

const props = defineProps<{ items: CvExperience[] }>()

const { t, locale } = useI18n()

const positions = computed(() => props.items.map(item => ({
  ...item,
  period: `${formatYearMonth(item.start, locale.value)} — ${item.end ? formatYearMonth(item.end, locale.value) : t('cv.present')}`,
  duration: formatDuration(monthsBetween(item.start, item.end), locale.value),
})))
</script>

<template>
  <CvCard :title="$t('cv.sections.experience')">
    <ol class="timeline">
      <li
        v-for="position in positions"
        :key="position.id"
        class="position"
      >
        <h4 class="role">
          {{ position.role }}
          <span class="at">·</span>
          <a
            v-if="position.url"
            :href="position.url"
            target="_blank"
            rel="noopener noreferrer"
            class="company link"
          >{{ position.company }}</a>
          <span
            v-else
            class="company"
          >{{ position.company }}</span>
        </h4>
        <p class="period">
          {{ position.period }} · {{ position.duration }}
        </p>
        <p class="summary">
          {{ position.summary }}
        </p>
        <ul class="highlights">
          <li
            v-for="(highlight, index) in position.highlights"
            :key="index"
          >
            {{ highlight }}
          </li>
        </ul>
        <ul
          class="stack"
          :aria-label="$t('cv.stack')"
        >
          <li
            v-for="tech in position.stack"
            :key="tech"
          >
            <Badge variant="secondary">
              {{ tech }}
            </Badge>
          </li>
        </ul>
      </li>
    </ol>
  </CvCard>
</template>

<style scoped>
@reference "~/assets/css/main.css";

/* Vertical line on the left, a dot per position */
.timeline {
  @apply ml-1.5 flex flex-col gap-6 border-l pl-5;
}

.position {
  @apply relative flex flex-col gap-2;
}

.position::before {
  @apply absolute top-1.5 -left-[1.6875rem] size-2.5 rounded-full border-2 border-background bg-primary;
  content: '';
}

.role {
  @apply font-semibold;
}

.at {
  @apply mx-1 text-muted-foreground;
}

.link {
  @apply underline-offset-4 hover:underline;
}

.period {
  @apply text-sm text-muted-foreground;
}

.summary {
  @apply leading-relaxed;
}

.highlights {
  @apply flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed marker:text-muted-foreground;
}

.stack {
  @apply flex flex-wrap gap-1.5;
}
</style>
