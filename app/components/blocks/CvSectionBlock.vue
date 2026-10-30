<script setup lang="ts">
import { getExperienceYears } from '#shared/cv'
import type { CvDataPart, CvToolPart } from '#shared/types/chat'
import CvAbout from './CvAbout.vue'
import CvEducation from './CvEducation.vue'
import CvExperience from './CvExperience.vue'
import CvHero from './CvHero.vue'
import CvSkills from './CvSkills.vue'

// `data-cv` part (local scenario) or `tool-showCvSection` (the agent decided to show it).
// Both only name a section, the data comes from the CV of the current locale.
const props = defineProps<{ part: CvDataPart<'cv'> | CvToolPart<'showCvSection'> }>()

const cv = useCv()

const shown = computed(() => {
  const part = props.part
  if (part.type === 'data-cv') return part.data
  // Nothing to show while the tool call is streaming in; it resolves at once
  return part.state === 'output-available' ? part.output : undefined
})
const section = computed(() => shown.value?.section)

// Jobs picked by id; unknown ids are skipped, and if none is left the whole list is shown
const jobs = computed(() => {
  const all = cv.value.experience
  const ids = shown.value?.items
  const picked = ids?.length ? all.filter(job => ids.includes(job.id)) : []
  return picked.length ? picked : all
})

const block = computed(() => {
  const data = cv.value
  switch (section.value) {
    case 'hero':
      return {
        component: CvHero,
        props: { person: data.person, contacts: data.contacts, experienceYears: getExperienceYears(data) },
      }
    case 'about':
      return { component: CvAbout, props: { paragraphs: data.about } }
    case 'experience':
      return { component: CvExperience, props: { items: jobs.value } }
    case 'education':
      return { component: CvEducation, props: { items: data.education, languages: data.languages } }
    case 'skills':
      return { component: CvSkills, props: { groups: data.skills } }
  }
  return undefined
})
</script>

<template>
  <component
    :is="block.component"
    v-if="block"
    v-bind="block.props"
  />
</template>
