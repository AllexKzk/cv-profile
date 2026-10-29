import { describe, expect, it } from 'vitest'
import { createLimiter, createUpstashLimiter, noopLimiter } from '../../../server/utils/rate-limit'
import type { LimiterStore } from '../../../server/utils/rate-limit'

function memoryStore(): LimiterStore & { data: Map<string, number> } {
  const data = new Map<string, number>()
  return {
    data,
    get: async <T>(key: string) => (data.get(key) ?? null) as T | null,
    incr: async (key) => {
      data.set(key, (data.get(key) ?? 0) + 1)
      return data.get(key)!
    },
    incrbyfloat: async (key, value) => {
      data.set(key, (data.get(key) ?? 0) + value)
      return data.get(key)!
    },
    expire: async () => 1,
  }
}

const config = { ipRequests: 15, ipDailyBudgetUsd: 1, dailyRequests: 2 }
const open = { limit: async () => ({ success: true }) }

describe('limiter', () => {
  it('is a no-op without Redis credentials', async () => {
    expect(createUpstashLimiter({}, config)).toBe(noopLimiter)
    expect(await noopLimiter.check('1.1.1.1')).toBeNull()
  })

  it('refuses an IP that spent its daily budget', async () => {
    const limiter = createLimiter(memoryStore(), open, config)
    await limiter.record('1.1.1.1', 0.6)
    expect(await limiter.check('1.1.1.1')).toBeNull()
    await limiter.record('1.1.1.1', 0.5)
    expect(await limiter.check('1.1.1.1')).toBe('ip_budget')
    expect(await limiter.check('2.2.2.2')).toBeNull()
  })

  it('refuses when the sliding window is full', async () => {
    const limiter = createLimiter(memoryStore(), { limit: async () => ({ success: false }) }, config)
    expect(await limiter.check('1.1.1.1')).toBe('rate_limit')
  })

  it('counts the global daily limit across IPs', async () => {
    const limiter = createLimiter(memoryStore(), open, config)
    expect(await limiter.check('1.1.1.1')).toBeNull()
    expect(await limiter.check('2.2.2.2')).toBeNull()
    expect(await limiter.check('3.3.3.3')).toBe('daily_limit')
  })

  it('keeps spend per UTC day', async () => {
    let now = new Date('2026-10-29T23:00:00Z')
    const store = memoryStore()
    const limiter = createLimiter(store, open, { ...config, dailyRequests: 100 }, () => now)
    await limiter.record('1.1.1.1', 2)
    expect(await limiter.check('1.1.1.1')).toBe('ip_budget')
    now = new Date('2026-10-30T01:00:00Z')
    expect(await limiter.check('1.1.1.1')).toBeNull()
  })
})
