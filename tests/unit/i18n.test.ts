import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import ru from '../../i18n/locales/ru.json'

type Messages = { [key: string]: string | Messages }

function flattenKeys(messages: Messages, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string' ? [path] : flattenKeys(value, path)
  })
}

describe('i18n dictionaries', () => {
  it('have the same set of keys', () => {
    const enKeys = flattenKeys(en)
    const ruKeys = flattenKeys(ru)

    expect(enKeys.filter(key => !ruKeys.includes(key)), 'missing in ru.json').toEqual([])
    expect(ruKeys.filter(key => !enKeys.includes(key)), 'missing in en.json').toEqual([])
  })
})
