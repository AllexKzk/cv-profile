import type { Cv } from '../cv/schema'
import { cvSkillNames, hasSkill } from '../cv/skill-match'
import type { BriefFit, VacancyBrief } from './brief'

// Quick fit of a brief against the CV, without the LLM: stable and explainable
export function briefFit(brief: VacancyBrief, cv: Cv): BriefFit {
  const names = cvSkillNames(cv)
  const check = (list: string[] = []) => list.map(name => ({ name, inCv: hasSkill(names, name) }))
  return {
    mustHave: check(brief.mustHave),
    niceToHave: check(brief.niceToHave),
    format: formatFit(brief.format ?? [], cv.person.openTo),
  }
}

function formatFit(wanted: NonNullable<VacancyBrief['format']>, openTo: Cv['person']['openTo']): BriefFit['format'] {
  if (!wanted.length) return 'unknown'
  if (wanted.some(format => openTo.includes(format))) return 'match'
  // Office only: fine if the candidate is open to moving
  if (openTo.includes('relocation')) return 'relocation'
  return 'mismatch'
}
