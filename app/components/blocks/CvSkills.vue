<script setup lang="ts">
import type { CvSkillGroup } from '#shared/cv'
import CvCard from './CvCard.vue'

defineProps<{ groups: CvSkillGroup[] }>()

const isRequested = useRequestedSkills()
</script>

<template>
  <CvCard :title="$t('cv.sections.skills')">
    <dl class="groups">
      <div
        v-for="group in groups"
        :key="group.id"
        class="group"
      >
        <dt class="name">
          {{ group.name }}
        </dt>
        <dd class="items">
          <Badge
            v-for="item in group.items"
            :key="item.name"
            :variant="item.main ? 'default' : 'secondary'"
            :class="{ requested: isRequested([item.name, ...item.aliases]) }"
            :title="isRequested([item.name, ...item.aliases]) ? $t('cv.requested') : undefined"
          >
            {{ item.name }}
          </Badge>
        </dd>
      </div>
    </dl>
  </CvCard>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.groups {
  @apply flex flex-col gap-4;
}

.group {
  @apply flex flex-col gap-2;
}

.name {
  @apply text-sm text-muted-foreground;
}

.items {
  @apply flex flex-wrap gap-1.5;
}

.requested {
  @apply skill-requested;
}
</style>
