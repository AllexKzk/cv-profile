import { describe, expect, it } from 'vitest'
import { cn } from '../../app/lib/utils'

describe('cn', () => {
  it('joins classes and skips falsy values', () => {
    expect(cn('px-2', false, undefined, 'py-1')).toBe('px-2 py-1')
  })

  it('resolves tailwind conflicts in favor of the last class', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
