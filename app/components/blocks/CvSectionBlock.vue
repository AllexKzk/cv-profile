<script setup lang="ts">
import { getExperienceYears } from '#shared/cv'
import type { CvDataPart } from '#shared/types/chat'
import CvAbout from './CvAbout.vue'
import CvEducation from './CvEducation.vue'
import CvExperience from './CvExperience.vue'
import CvHero from './CvHero.vue'
import CvSkills from './CvSkills.vue'

// `data-cv` part: the part names a section, the data comes from the CV of the current locale
const props = defineProps<{ part: CvDataPart<'cv'> }>()

const cv = useCv()

const block = computed(() => {
  const data = cv.value
  switch (props.part.data.section) {
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
