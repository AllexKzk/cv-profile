import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'

export interface ModelConfig {
  apiKey: string
  model: string
  // Comma-separated model ids
  fallbackModels: string
  siteUrl?: string
}

// Prices of the default model, USD per token: used when OpenRouter does not report the cost
const FALLBACK_PRICE = { input: 0.1 / 1e6, output: 0.5 / 1e6 }

export function createChatModel(config: ModelConfig): LanguageModel {
  const openrouter = createOpenRouter({
    apiKey: config.apiKey,
    compatibility: 'strict',
    appName: 'CV Agent',
    appUrl: config.siteUrl || undefined,
  })
  const fallbacks = config.fallbackModels.split(',').map(id => id.trim()).filter(Boolean)
  return openrouter.chat(config.model, {
    // OpenRouter tries them in order when the first one is unavailable
    models: fallbacks.length ? [config.model, ...fallbacks] : undefined,
    // Adds the real cost of the request to providerMetadata
    usage: { include: true },
  })
}

interface StepCost {
  usage: { inputTokens?: number, outputTokens?: number }
  providerMetadata?: Record<string, Record<string, unknown> | undefined>
}

// Cost of all steps of an answer: OpenRouter's own number, or an estimate by tokens
export function answerCost(steps: StepCost[]): number {
  return steps.reduce((sum, step) => {
    const usage = step.providerMetadata?.openrouter?.usage as { cost?: number } | undefined
    if (typeof usage?.cost === 'number') return sum + usage.cost
    return sum
      + (step.usage.inputTokens ?? 0) * FALLBACK_PRICE.input
      + (step.usage.outputTokens ?? 0) * FALLBACK_PRICE.output
  }, 0)
}
