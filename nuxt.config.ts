import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
    'shadcn-nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/fonts',
    '@nuxtjs/i18n',
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
    storageKey: 'cv-color-mode',
  },
  // Empty defaults are overridden at runtime by NUXT_* env vars (see .env.example)
  runtimeConfig: {
    openrouterApiKey: '',
    openrouterModel: 'anthropic/claude-haiku-5.5',
    openrouterFallbackModels: 'openai/gpt-6-luna,deepseek/deepseek-v4.1-flash',
    upstashRedisRestUrl: '',
    upstashRedisRestToken: '',
    ipRequestLimit: 15,
    ipDailyBudgetUsd: 1,
    dailyLlmLimit: 500,
    telegramBotToken: '',
    telegramChatId: '',
    leadIpDailyLimit: 1,
    leadDailyLimit: 20,
    public: {
      siteUrl: '',
    },
  },
  compatibilityDate: '2026-10-29',
  nitro: {
    // The chat streams an answer for up to tens of seconds
    vercel: { functions: { maxDuration: 60 } },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  typescript: {
    strict: true,
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
  fonts: {
    defaults: {
      weights: [400, 500, 700],
    },
  },
  i18n: {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'cv-locale',
      redirectOn: 'root',
    },
  },
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
})
