import { describe, expect, it, vi } from 'vitest'
import BriefCard from '~/components/blocks/BriefCard.vue'
import CvDownloadBlock from '~/components/blocks/CvDownloadBlock.vue'
import CvSectionBlock from '~/components/blocks/CvSectionBlock.vue'
import LeadSentBlock from '~/components/blocks/LeadSentBlock.vue'
import MarkdownBlock from '~/components/blocks/MarkdownBlock.vue'
import QuestionWidget from '~/components/blocks/QuestionWidget.vue'
import TextBlock from '~/components/blocks/TextBlock.vue'
import { resolveBlock } from '~/lib/block-registry'

describe('block registry', () => {
  it('resolves a registered part type', () => {
    expect(resolveBlock('data-cv', 'assistant')).toBe(CvSectionBlock)
    expect(resolveBlock('data-download', 'assistant')).toBe(CvDownloadBlock)
    expect(resolveBlock('tool-showCvSection', 'assistant')).toBe(CvSectionBlock)
    expect(resolveBlock('tool-askQuestion', 'assistant')).toBe(QuestionWidget)
    expect(resolveBlock('tool-submitBrief', 'assistant')).toBe(BriefCard)
    expect(resolveBlock('data-lead', 'assistant')).toBe(LeadSentBlock)
  })

  it('the interview marker renders nothing and does not warn', () => {
    const warn = vi.spyOn(console, 'warn')
    expect(resolveBlock('data-interview', 'user')).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('renders assistant text as Markdown and user text as is', () => {
    expect(resolveBlock('text', 'assistant')).toBe(MarkdownBlock)
    expect(resolveBlock('text', 'user')).toBe(TextBlock)
  })

  it('returns nothing for an unknown type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveBlock('data-unknown', 'assistant')).toBeUndefined()
    warn.mockRestore()
  })
})
