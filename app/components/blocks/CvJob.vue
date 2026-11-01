<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { formatDuration, formatYearMonth, monthsBetween } from '#shared/cv'
import type { CvExperience } from '#shared/cv'
import CvCard from './CvCard.vue'

// One job as a standalone card: the agent can show a single job on its own
const props = defineProps<{ job: CvExperience }>()

const { t, locale } = useI18n()

const period = computed(() => {
  const { start, end } = props.job
  return `${formatYearMonth(start, locale.value)} — ${end ? formatYearMonth(end, locale.value) : t('cv.present')}`
})
const duration = computed(() => formatDuration(monthsBetween(props.job.start, props.job.end), locale.value))
</script>

<template>
  <CvCard>
    <article class="job">
      <header class="head">
        <div class="who">
          <h4 class="role">
            {{ job.role }}
          </h4>
          <a
            v-if="job.url"
            :href="job.url"
            target="_blank"
            rel="noopener noreferrer"
            class="company link"
          >
            {{ job.company }}
            <ArrowUpRight class="arrow" />
          </a>
          <p
            v-else
            class="company"
          >
            {{ job.company }}
          </p>
        </div>
        <p class="when">
          <span class="period">{{ period }}</span>
          <span class="duration">{{ duration }}</span>
        </p>
      </header>

      <p class="summary">
        {{ job.summary }}
      </p>

      <section
        v-if="job.products.length"
        class="group"
      >
        <h5 class="label">
          {{ $t('cv.products') }}
        </h5>
        <ul class="products">
          <li
            v-for="product in job.products"
            :key="product.id"
            class="product"
            data-glass
          >
            <a
              v-if="product.url"
              :href="product.url"
              target="_blank"
              rel="noopener noreferrer"
              class="product-name link"
            >
              {{ product.name }}
              <ArrowUpRight class="arrow" />
            </a>
            <span
              v-else
              class="product-name"
            >{{ product.name }}</span>
            <span class="product-description">{{ product.description }}</span>
          </li>
        </ul>
      </section>

      <section
        v-if="job.highlights.length"
        class="group"
      >
        <h5 class="label">
          {{ $t('cv.achievements') }}
        </h5>
        <ul class="achievements">
          <li
            v-for="(highlight, index) in job.highlights"
            :key="index"
            class="achievement"
          >
            <p class="achievement-title">
              {{ highlight.title }}
            </p>
            <p
              v-if="highlight.details"
              class="achievement-details"
            >
              {{ highlight.details }}
            </p>
          </li>
        </ul>
      </section>

      <ul
        class="stack"
        :aria-label="$t('cv.stack')"
      >
        <li
          v-for="tech in job.stack"
          :key="tech"
        >
          <Badge variant="secondary">
            {{ tech }}
          </Badge>
        </li>
      </ul>
    </article>
  </CvCard>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.job {
  @apply flex flex-col gap-4;
}

.head {
  @apply flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4;
}

.who {
  @apply flex min-w-0 flex-col gap-0.5;
}

.role {
  @apply text-base font-semibold;
}

.company {
  @apply inline-flex w-fit items-center gap-0.5 text-sm font-medium text-primary;
}

.link {
  @apply underline-offset-4 hover:underline;
}

.arrow {
  @apply size-3.5 opacity-70;
}

.when {
  @apply flex shrink-0 gap-1.5 text-sm text-muted-foreground sm:flex-col sm:items-end sm:gap-0;
}

.duration {
  @apply before:content-['·'] before:mr-1.5 sm:before:content-none sm:before:mr-0;
}

.summary {
  @apply leading-relaxed text-muted-foreground;
}

.group {
  @apply flex flex-col gap-2;
}

.label {
  @apply text-xs font-medium tracking-wide text-muted-foreground uppercase;
}

/* Products are tiles: each one is a separate thing the person worked on */
.products {
  @apply grid gap-2 sm:grid-cols-2;
}

.product {
  @apply flex flex-col gap-0.5 rounded-lg glass px-3 py-2;
}

.product-name {
  @apply inline-flex w-fit items-center gap-0.5 text-sm font-medium;
}

.product-description {
  @apply text-sm text-muted-foreground;
}

.achievements {
  @apply flex flex-col gap-2.5;
}

/* A short accent bar instead of a bullet keeps the title and its details together */
.achievement {
  @apply border-l-2 border-primary/60 pl-3;
}

.achievement-title {
  @apply text-sm font-medium leading-snug;
}

.achievement-details {
  @apply mt-0.5 text-sm leading-relaxed text-muted-foreground;
}

.stack {
  @apply flex flex-wrap gap-1.5 border-t pt-4;
}
</style>
