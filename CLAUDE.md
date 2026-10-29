# CV Agent

Personal CV site built as a chat with an AI agent. Read `docs/ARCHITECTURE.md` for the design
and `docs/PLAN.md` for the steps. Docs are in Russian, code and comments are in English.

## Process

- A step is one product feature (see the table in `docs/PLAN.md`), usually in its own chat session.
- Every step has a short spec in `docs/specs/<id>-<slug>.md` (template `docs/specs/_template.md`):
  goal, scope, key decisions, checks, open questions. Code only after the owner approves it.
- Work on branch `step/<id>-<slug>`. Do what the spec says. Stop and ask before a big deviation,
  list small ones in the report.
- Finish with a report: what was done, how it works under the hood, where to start the review,
  what was not verified, deviations from the spec.
- The owner reviews and merges. Do not merge, push to `main` or deploy unless asked.

## Commands

```bash
pnpm dev         # http://localhost:3000
pnpm lint        # eslint (stylistic rules, no Prettier); pnpm lint:fix to autofix
pnpm typecheck   # vue-tsc via nuxt typecheck
pnpm test        # vitest: tests/unit (node, pure logic) and tests/nuxt (Nuxt env + happy-dom, components)
pnpm build
```

All four checks (`lint`, `typecheck`, `test`, `build`) must pass before the report.

## Stack

Nuxt 4 (SSR), TypeScript strict, Tailwind v4 (`@tailwindcss/vite`), shadcn-vue (reka-ui),
`@nuxtjs/color-mode`, `@nuxt/fonts`, `@nuxtjs/i18n`, Vitest. Deploy: Vercel.

## Conventions

- `<script setup lang="ts">`, Composition API, components in PascalCase.
- Every UI string goes through i18n (`i18n/locales/en.json` and `ru.json` together; a test checks
  that both have the same keys).
- Style with theme tokens (`bg-background`, `text-muted-foreground`), never raw colors like `bg-white`.
- No Tailwind utility classes in templates. Give elements semantic class names and apply
  utilities in `<style scoped>` with `@apply`. Each style block must start with
  `@reference "~/assets/css/main.css";` so Tailwind v4 knows the theme tokens and the `dark` variant:

  ```vue
  <template>
    <header class="header">…</header>
  </template>

  <style scoped>
  @reference "~/assets/css/main.css";

  .header {
    @apply flex items-center justify-between;
  }
  </style>
  ```

  Exception: generated shadcn components in `app/components/ui` stay as generated (cva variants).
  Passing a utility to a shadcn component prop (`class`, `variant`, `size`) is fine.
- Icons from `@lucide/vue`.
- shadcn components are added with `pnpm dlx shadcn-vue@2.9.0 add <name>` into `app/components/ui`,
  only in the step that needs them.
- Secrets only in server `runtimeConfig`, set via `NUXT_*` env vars (see `.env.example`).
  Never in `runtimeConfig.public`, never in code.

## Known pitfalls

- `shadcn-vue add` may insert a Google Fonts `@import` into `app/assets/css/main.css`. Check the
  diff and remove it: fonts are self-hosted by `@nuxt/fonts`.
- `lucide-vue-next` is deprecated, use `@lucide/vue`.
- TypeScript is pinned to 5.9: typescript-eslint does not support 7.x yet.
- After changing `nuxt.config.ts` or `main.css` heavily, restart the dev server: HMR can keep stale CSS.
