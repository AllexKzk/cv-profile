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

const section = computed(() => {
  const part = props.part
  if (part.type === 'data-cv') return part.data.section
  // Nothing to show while the tool call is streaming in; it resolves at once
  return part.state === 'output-available' ? part.output.section : undefined
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
      return { component: CvExperience, props: { items: data.experience } }
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
