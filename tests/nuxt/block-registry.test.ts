import { describe, expect, it, vi } from 'vitest'
import CvDownloadBlock from '~/components/blocks/CvDownloadBlock.vue'
import CvSectionBlock from '~/components/blocks/CvSectionBlock.vue'
import MarkdownBlock from '~/components/blocks/MarkdownBlock.vue'
import TextBlock from '~/components/blocks/TextBlock.vue'
import { resolveBlock } from '~/lib/block-registry'

describe('block registry', () => {
  it('resolves a registered part type', () => {
    expect(resolveBlock('data-cv', 'assistant')).toBe(CvSectionBlock)
    expect(resolveBlock('data-download', 'assistant')).toBe(CvDownloadBlock)
    expect(resolveBlock('tool-showCvSection', 'assistant')).toBe(CvSectionBlock)
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
