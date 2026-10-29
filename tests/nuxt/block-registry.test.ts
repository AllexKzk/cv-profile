import { describe, expect, it, vi } from 'vitest'
import CvDownloadBlock from '~/components/blocks/CvDownloadBlock.vue'
import CvSectionBlock from '~/components/blocks/CvSectionBlock.vue'
import TextBlock from '~/components/blocks/TextBlock.vue'
import { resolveBlock } from '~/lib/block-registry'

describe('block registry', () => {
  it('resolves a registered part type', () => {
    expect(resolveBlock('text')).toBe(TextBlock)
    expect(resolveBlock('data-cv')).toBe(CvSectionBlock)
    expect(resolveBlock('data-download')).toBe(CvDownloadBlock)
  })

  it('returns nothing for an unknown type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveBlock('data-unknown')).toBeUndefined()
    warn.mockRestore()
  })
})
