import { describe, expect, it } from 'vitest'
import { chatErrorCode } from '../../app/lib/chat-error'
import { renderMarkdown } from '../../app/lib/markdown'

describe('renderMarkdown', () => {
  it('renders lists, bold and links that open in a new tab', () => {
    const html = renderMarkdown('**Vue** and:\n\n- Nuxt\n- [GitHub](https://github.com)')
    expect(html).toContain('<strong>Vue</strong>')
    expect(html).toContain('<li>Nuxt</li>')
    expect(html).toContain('<a href="https://github.com" target="_blank" rel="noopener noreferrer">')
  })

  it('escapes raw HTML', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"><script>alert(1)</script>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script')
    expect(html).toContain('&lt;script&gt;')
  })

  it('drops dangerous links and images', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('href')
    expect(renderMarkdown('![x](https://tracker.example/p.png)')).not.toContain('<img')
  })
})

describe('chatErrorCode', () => {
  it('reads codes of refused requests and failed streams', () => {
    expect(chatErrorCode(new Error('{"code":"rate_limit"}'))).toBe('rate_limit')
    expect(chatErrorCode(new Error('model_error'))).toBe('model_error')
    expect(chatErrorCode(new Error('Failed to fetch'))).toBe('network')
    expect(chatErrorCode(new Error('{"code":"whatever"}'))).toBe('network')
  })
})
