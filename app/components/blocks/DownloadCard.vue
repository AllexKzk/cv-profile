<script setup lang="ts">
import { Download, FileText } from '@lucide/vue'
import { formatYearMonth } from '#shared/cv'
import CvCard from './CvCard.vue'

const props = defineProps<{
  href: string
  updatedAt: string
}>()

const { locale } = useI18n()

const fileName = computed(() => props.href.split('/').pop() ?? '')
const updated = computed(() => formatYearMonth(props.updatedAt, locale.value))
</script>

<template>
  <CvCard>
    <div class="download">
      <FileText class="icon" />
      <div class="info">
        <p class="name">
          {{ fileName }}
        </p>
        <p class="updated">
          {{ $t('cv.download.updated', { date: updated }) }}
        </p>
      </div>
      <Button as-child>
        <a
          :href="href"
          :download="fileName"
        >
          <Download />
          {{ $t('cv.download.button') }}
        </a>
      </Button>
    </div>
  </CvCard>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.download {
  @apply flex flex-wrap items-center gap-4;
}

.icon {
  @apply size-8 shrink-0 text-muted-foreground;
}

.info {
  @apply min-w-0 flex-1;
}

.name {
  @apply truncate font-medium;
}

.updated {
  @apply text-sm text-muted-foreground;
}
</style>
