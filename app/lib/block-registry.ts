import type { Component } from 'vue'
import type { CvMessagePart, CvUIMessage } from '#shared/types/chat'
import BriefCard from '~/components/blocks/BriefCard.vue'
import CvDownloadBlock from '~/components/blocks/CvDownloadBlock.vue'
import CvSectionBlock from '~/components/blocks/CvSectionBlock.vue'
import LeadSentBlock from '~/components/blocks/LeadSentBlock.vue'
import MarkdownBlock from '~/components/blocks/MarkdownBlock.vue'
import MatchReport from '~/components/blocks/MatchReport.vue'
import QuestionWidget from '~/components/blocks/QuestionWidget.vue'
import TextBlock from '~/components/blocks/TextBlock.vue'
import VacancyAttachmentBlock from '~/components/blocks/VacancyAttachmentBlock.vue'

type PartType = CvMessagePart['type']

// part.type → component that renders it. A new block = component + a line here + a type in CvUIMessage.
export const blockRegistry: Partial<Record<PartType, Component>> = {
  'text': TextBlock,
  'data-cv': CvSectionBlock,
  'data-download': CvDownloadBlock,
  'data-vacancy': VacancyAttachmentBlock,
  'tool-showCvSection': CvSectionBlock,
  'tool-askQuestion': QuestionWidget,
  'tool-submitBrief': BriefCard,
  'data-lead': LeadSentBlock,
  'tool-analyzeVacancy': MatchReport,
}

// Service parts of AI SDK and markers that have nothing to show
const SILENT_PARTS = new Set<string>(['step-start', 'reasoning', 'data-interview', 'data-priorities'])

export function resolveBlock(type: string, role: CvUIMessage['role']): Component | undefined {
  // Assistant text is Markdown; what the user typed stays plain text
  if (type === 'text' && role === 'assistant') return MarkdownBlock
  const block = blockRegistry[type as PartType]
  if (!block && import.meta.dev && !SILENT_PARTS.has(type)) {
    console.warn(`[chat] No block registered for part type "${type}"`)
  }
  return block
}
