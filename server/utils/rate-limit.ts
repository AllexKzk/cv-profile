import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { ChatErrorCode } from '#shared/types/chat'

export interface LimitsConfig {
  // Requests per IP per 10 minutes
  ipRequests: number
  // Spend per IP per UTC day, USD
  ipDailyBudgetUsd: number
  // LLM requests of the whole site per UTC day
  dailyRequests: number
}

export interface Limiter {
  // Error code when the request must be refused, null when it may go on
  check: (ip: string) => Promise<Extract<ChatErrorCode, 'rate_limit' | 'ip_budget' | 'daily_limit'> | null>
  // Adds the cost of a finished answer to the IP's daily spend
  record: (ip: string, costUsd: number) => Promise<void>
}

// The subset of Redis the limiter needs: tests pass an in-memory fake
export interface LimiterStore {
  get: <T>(key: string) => Promise<T | null>
  incr: (key: string) => Promise<number>
  incrbyfloat: (key: string, value: number) => Promise<number>
  expire: (key: string, seconds: number) => Promise<unknown>
}

// Sliding window per IP, @upstash/ratelimit in production
export interface RequestWindow {
  limit: (ip: string) => Promise<{ success: boolean }>
}

const DAY_TTL = 2 * 24 * 60 * 60
const today = (now: Date) => now.toISOString().slice(0, 10)

export const noopLimiter: Limiter = {
  check: async () => null,
  record: async () => {},
}

export function createLimiter(store: LimiterStore, window: RequestWindow, config: LimitsConfig, now = () => new Date()): Limiter {
  const costKey = (ip: string) => `cv:ip-cost:${ip}:${today(now())}`

  return {
    async check(ip) {
      // Spend is read first: it does not consume anything
      const spent = Number(await store.get<number | string>(costKey(ip)) ?? 0)
      if (spent >= config.ipDailyBudgetUsd) return 'ip_budget'

      if (!(await window.limit(ip)).success) return 'rate_limit'

      const dailyKey = `cv:daily:${today(now())}`
      const count = await store.incr(dailyKey)
      if (count === 1) await store.expire(dailyKey, DAY_TTL)
      if (count > config.dailyRequests) return 'daily_limit'

      return null
    },
    async record(ip, costUsd) {
      if (!(costUsd > 0)) return
      const key = costKey(ip)
      await store.incrbyfloat(key, costUsd)
      await store.expire(key, DAY_TTL)
    },
  }
}

export interface RedisCredentials {
  url?: string
  token?: string
}

let warned = false

function upstashRedis({ url, token }: RedisCredentials): Redis | null {
  if (!url || !token) {
    if (import.meta.dev && !warned) {
      warned = true
      console.warn('[chat] Upstash Redis is not configured: rate limits are disabled')
    }
    return null
  }
  return new Redis({ url, token })
}

// Upstash limiter, or a no-op one when Redis is not configured (local development)
export function createUpstashLimiter(credentials: RedisCredentials, config: LimitsConfig): Limiter {
  const redis = upstashRedis(credentials)
  if (!redis) return noopLimiter

  const window = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.ipRequests, '10 m'),
    prefix: 'cv:rl',
  })
  return createLimiter(redis, window, config)
}

export const openWindow: RequestWindow = { limit: async () => ({ success: true }) }

// A plain per-IP window (`requests` per 10 minutes) for routes without LLM spend
export function createUpstashWindow(credentials: RedisCredentials, requests: number, prefix: string): RequestWindow {
  const redis = upstashRedis(credentials)
  if (!redis) return openWindow
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, '10 m'), prefix })
}
