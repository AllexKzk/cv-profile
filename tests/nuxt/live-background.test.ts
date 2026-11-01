import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LiveBackground from '~/components/layout/LiveBackground.vue'

describe('LiveBackground', () => {
  it('renders a hidden decorative canvas that stays invisible until the first frame', async () => {
    const wrapper = await mountSuspended(LiveBackground)
    const canvas = wrapper.find('canvas')
    expect(canvas.attributes('aria-hidden')).toBe('true')
    expect(canvas.classes()).toContain('field')
    expect(canvas.classes()).not.toContain('ready')
  })

  it('survives a browser without WebGL or 2D canvas', async () => {
    // happy-dom has no canvas contexts: init must fail quietly, not throw
    const wrapper = await mountSuspended(LiveBackground)
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(wrapper.find('canvas').classes()).not.toContain('ready')
    wrapper.unmount()
  })
})
