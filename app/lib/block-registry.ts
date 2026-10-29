import type { Component } from 'vue'
import type { CvMessagePart } from '#shared/types/chat'
import CvDownloadBlock from '~/components/blocks/CvDownloadBlock.vue'
import CvSectionBlock from '~/components/blocks/CvSectionBlock.vue'
import TextBlock from '~/components/blocks/TextBlock.vue'

type PartType = CvMessagePart['type']

// part.type → component that renders it. A new block = component + a line here + a type in CvUIMessage.
export const blockRegistry: Partial<Record<PartType, Component>> = {
  'text': TextBlock,
  'data-cv': CvSectionBlock,
  'data-download': CvDownloadBlock,
}

// Service parts of AI SDK that have nothing to show
const SILENT_PARTS = new Set<string>(['step-start'])

export function resolveBlock(type: string): Component | undefined {
  const block = blockRegistry[type as PartType]
  if (!block && import.meta.dev && !SILENT_PARTS.has(type)) {
    console.warn(`[chat] No block registered for part type "${type}"`)
  }
  return block
}
