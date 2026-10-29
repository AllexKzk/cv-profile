# CV Agent — архитектура

Личный сайт-резюме в виде чата с AI-агентом. Пользователь (рекрутер / нанимающий менеджер) общается
с агентом, который знает резюме Александра Козикова, отвечает на вопросы, проводит интервью
по вакансии и считает совместимость с загруженной вакансией. Ответы — не только текст, но и
интерактивные компоненты (Intelligent / Generative UI).

---

## 1. Стек

| Слой | Выбор | Комментарий |
|---|---|---|
| Фреймворк | **Nuxt 4** (SSR), TypeScript strict | структура `app/`, `server/`, `shared/` |
| UI | **shadcn-vue** + Tailwind CSS v4 | shadcn — это React; для Vue используем порт `shadcn-vue` (reka-ui под капотом) |
| Иконки | `lucide-vue-next` | + simple-icons для Telegram/GitHub/LinkedIn |
| i18n | `@nuxtjs/i18n` | `en` (default), `ru`; стратегия `prefix_except_default` |
| Тема | `@nuxtjs/color-mode` | `class`-стратегия, совместимо с shadcn |
| AI-клиент | **Vercel AI SDK** (`ai`, `@ai-sdk/vue`) | стриминг, tool calling, типизированные UI-messages |
| LLM-провайдер | **OpenRouter** через `@openrouter/ai-sdk-provider` | модель задаётся env-переменной |
| Валидация | `zod` | схемы CV, брифа, отчёта о совместимости, входов tools |
| Парсинг файлов | `unpdf` (PDF), `mammoth` (DOCX) | работают в serverless |
| Rate limit | `@upstash/ratelimit` + Upstash Redis (Vercel Marketplace) | защита бюджета OpenRouter |
| Деплой | Vercel (Nitro preset `vercel`, автоопределение) | секреты в Vercel env |
| Тесты | Vitest (unit), Playwright (smoke e2e) | |

> Версии API AI SDK меняются между мажорами. Перед реализацией сверяться с актуальной документацией
> `ai-sdk.dev` (Vue/Nuxt раздел) — названия вроде `addToolResult`, `sendAutomaticallyWhen`,
> `stopWhen` могли измениться.

---

## 2. Ключевая идея: единая модель сообщений + реестр блоков

Всё, что видно в чате, — это `UIMessage` из AI SDK со списком `parts`. Рендер части определяется
её типом через **реестр блоков** (`app/lib/block-registry.ts`), а не через `if/else` в шаблоне.

```
UIMessage
 ├─ role: 'user' | 'assistant'
 └─ parts[]
     ├─ { type: 'text' }                      → Markdown-текст (стрим)
     ├─ { type: 'data-cv', data: {section} }  → CvHero / CvAbout / CvExperience / ...  (локально)
     ├─ { type: 'data-download', data }       → DownloadCard                           (локально)
     ├─ { type: 'data-vacancy', data }        → AttachmentChip (вложение пользователя)
     ├─ { type: 'tool-showCvSection' }        → те же Cv*-компоненты, но по решению LLM
     ├─ { type: 'tool-askQuestion' }          → QuestionWidget (клиентский tool, ждёт ответа)
     ├─ { type: 'tool-submitBrief' }          → BriefCard
     ├─ { type: 'tool-askRequirementPriority'}→ PriorityWidget (клиентский tool)
     └─ { type: 'tool-showMatchReport' }      → MatchReport
```

Почему так:
- **Локальные сценарии** («Показать резюме», «Скачать резюме») просто добавляют в `chat.messages`
  сообщения с `data-*` частями — запроса к серверу нет, но выглядят они так же, как ответы агента.
- **LLM может сама показать компонент**: в свободном диалоге на вопрос «где он работал?» агент
  вызывает tool `showCvSection({section: 'experience'})` и рендерится тот же `CvExperience`.
- Тип сообщения описывается один раз в `shared/types/chat.ts` как
  `UIMessage<Metadata, DataParts, Tools>` → сквозная типизация от сервера до компонентов.

### Виды tools

| Tool | Где выполняется | Что делает |
|---|---|---|
| `showCvSection` | сервер (`execute` возвращает `{section}`) | показать блок резюме |
| `askQuestion` | **клиент** (без `execute`) | агент задаёт вопрос с виджетом (chips / multi-select / range / text); ответ пользователя → `addToolResult` → автоматическое продолжение |
| `submitBrief` | сервер | валидирует собранный бриф вакансии по zod-схеме, возвращает карточку + быстрый фит |
| `analyzeVacancy` | сервер | извлекает требования из текста вакансии (structured output) и классифицирует их против CV |
| `askRequirementPriority` | **клиент** | уточнение: «Насколько критичен Go?» → Must / Nice / Не важно |
| `showMatchReport` | сервер | детерминированно считает score по классификации + весам, отдаёт отчёт |

Клиентские tools — это и есть «интеллектуальный UI»: агент не пишет «выберите формат: удалёнка,
гибрид…», а вызывает `askQuestion({widget:'single', options:[...]})`, и пользователь кликает.

---

## 3. Сценарии

### 3.1 «Показать резюме» — без LLM
Кнопка → `useLocalScenarios().showCv()` → user-сообщение «Показать резюме» + assistant-сообщение
с частями `data-cv` для `hero`, `about`, `experience`, `education`, `skills`. Небольшая задержка /
поэтапное появление для ощущения «живого» ответа.

### 3.2 «Скачать резюме» — без LLM
Кнопка → сообщение с `DownloadCard` (EN/RU PDF, размер, дата обновления) + сразу триггер скачивания
текущей локали. PDF лежат статикой в `public/cv/`.

### 3.3 «Кого вы ищете?» — интервью (slot filling)
- Запрос к `/api/chat` с `scenario: 'interview'` → свой системный промпт + набор tools
  `askQuestion`, `submitBrief`.
- Схема брифа `VacancyBrief` (zod) — это и есть список «слотов»: должность, грейд, must-have стек,
  nice-to-have, домен/продукт, формат (remote/hybrid/office), страна / таймзона / релокация,
  тип занятости, вилка + валюта, этапы найма, сроки старта, контакт.
  **Финальный набор вопросов и виджетов — отдельная дизайн-сессия (задача T6.0).**
- Состояние = история сообщений (сервер stateless). Агент видит уже заданные вопросы и ответы.
- Агент может пропускать вопросы, если ответ уже прозвучал в свободном тексте.
- Финал: `submitBrief` → `BriefCard` (сводка + быстрый фит + CTA «Связаться» / «Загрузить полное
  описание вакансии»).
- CTA «Отправить Александру» → заявка в Telegram (см. §8).

### 3.4 «Загрузить вакансию» — оценка совместимости
1. Пользователь прикрепляет файл (`pdf`, `docx`, `md`, `txt`) или вставляет текст. Лимит 2 МБ /
   ~30k символов.
2. Клиент шлёт файл в `POST /api/parse-vacancy` (multipart) → сервер извлекает текст → клиент
   добавляет в user-сообщение часть `data-vacancy { fileName, text }` (показывается чипом).
3. `/api/chat` с `scenario: 'match'`: агент вызывает `analyzeVacancy` →
   получает список требований `{ name, category, importance: must|nice, status: match|partial|missing, evidence }`.
4. Если есть **missing must-have** или неоднозначности — агент вызывает `askRequirementPriority`
   (по одному или пачкой), пользователь отвечает.
5. `showMatchReport` — **score считается кодом**, а не LLM: взвешенная сумма по требованиям
   (must > nice, partial = 0.5, понижение веса после ответа «не критично»). Это даёт стабильные,
   объяснимые цифры. LLM пишет только текстовое резюме и рекомендации.
6. `MatchReport`: общий процент, разбивка по категориям (стек, опыт, домен, формат/локация,
   зарплата если известна), списки ✅ / ⚠️ / ❌ с evidence из резюме, сильные стороны, риски,
   CTA. **Детальный дизайн компонента — отдельная сессия (задача T7.0).**

Почему не отдаём PDF напрямую модели: извлечение текста на нашей стороне дешевле, не зависит от
поддержки file-input у конкретной модели и позволяет ограничить размер.

Дополнительные форматы на потом: скриншот вакансии (нужна vision-модель), ссылка на hh.ru (у hh
есть открытый API). LinkedIn по ссылке не парсим — блокирует.

### 3.5 Свободный чат
`scenario: 'free'` — Q&A по резюме. Tools: `showCvSection`. Агент отвечает только про кандидата,
не выдумывает факты, при отсутствии информации предлагает связаться напрямую.

---

## 4. Сервер

```
server/
  api/
    chat.post.ts            # streamText → toUIMessageStreamResponse
    parse-vacancy.post.ts   # multipart → { text, fileName, chars }
    lead.post.ts            # заявка → Telegram Bot API
  utils/
    openrouter.ts           # createOpenRouter({ apiKey }), выбор модели из runtimeConfig
    rate-limit.ts           # Upstash, по IP; no-op если нет env (локальная разработка)
    guard.ts                # лимиты: длина сообщений, кол-во сообщений, размер вложений
    cv.ts                   # загрузка CV по локали + сериализация для промпта
    match-score.ts          # чистая функция расчёта score (покрыта unit-тестами)
    prompts/
      base.ts               # личность, правила, язык ответа = locale, анти-инъекции
      interview.ts
      match.ts
      free.ts
    tools/
      show-cv-section.ts
      ask-question.ts
      submit-brief.ts
      analyze-vacancy.ts
      ask-requirement-priority.ts
      show-match-report.ts
```

`POST /api/chat` body: `{ messages, scenario, locale }`.
Обработка: rate limit → валидация (zod) → обрезка истории (последние N сообщений) →
`convertToModelMessages` (части `data-vacancy` превращаются в текст внутри `<vacancy>…</vacancy>`) →
`streamText({ model, system, tools, stopWhen: stepCount(…), maxOutputTokens })`.

### Безопасность и бюджет
- `NUXT_OPENROUTER_API_KEY` только в `runtimeConfig` (серверная часть), никогда не в `public`.
- Лимиты по IP, глобальный дневной лимит и лимит токенов на ответ — см. §9.
- Текст вакансии — это **данные**, а не инструкции: обёртка в теги + явное правило в системном
  промпте; агент не меняет роль и не раскрывает промпт.
- Fallback-модели через OpenRouter (`models: [...]`) на случай недоступности основной.
- Лимит в Vercel на тело запроса — 4.5 МБ; держим вложения ≤ 2 МБ.
- `maxDuration` для функции чата (стрим может идти 20–40 с).

### Env (Vercel)
Имена с префиксом `NUXT_` — Nuxt сам подставляет их в `runtimeConfig` (полный список с комментариями в `.env.example`).
```
NUXT_OPENROUTER_API_KEY=
NUXT_OPENROUTER_MODEL=            # основная модель с надёжным tool calling
NUXT_OPENROUTER_FALLBACK_MODELS=  # через запятую
NUXT_UPSTASH_REDIS_REST_URL=
NUXT_UPSTASH_REDIS_REST_TOKEN=
NUXT_DAILY_LLM_LIMIT=500
NUXT_TELEGRAM_BOT_TOKEN=
NUXT_TELEGRAM_CHAT_ID=
NUXT_PUBLIC_SITE_URL=https://allexkzk.dev
```

---

## 5. Данные резюме — единый источник правды

`shared/cv/schema.ts` (zod) + `shared/cv/en.ts`, `shared/cv/ru.ts`.
Используются в трёх местах: UI-блоки, системный промпт агента, SSR-страница `/cv` и JSON-LD.

```ts
Cv {
  person:     { name, title, yearsOfExperience, location, photo, openTo: ('remote'|'hybrid'|'relocation')[] }
  contacts:   { email, telegram, linkedin, github, site }
  about:      string[]                         // абзацы
  skills:     { group, items: { name, aliases?: string[], level?: 'main'|'also' }[] }[]
  experience: { company, role, start, end|null, summary, highlights: string[], stack: string[] }[]
  education:  { degree, institution, start, end }[]
  languages:  { name, level }[]
  updatedAt:  string
}
```
`aliases` (`Vue.js`, `VueJS` → `Vue`) помогают при сопоставлении с требованиями вакансии.

---

## 6. Клиент

```
app/
  app.vue
  pages/
    index.vue               # чат
    cv.vue                  # статичная SSR-версия резюме (SEO, для тех, кто не хочет чат)
  layouts/default.vue       # TopBar + слот
  components/
    layout/   TopBar, ContactLinks, ThemeToggle, LocaleSwitch, InfoDialog
    chat/     ChatShell, ChatGreeting, QuickActions, MessageList, MessageItem,
              MessagePart (диспетчер по реестру), ChatInput, AttachmentChip, TypingIndicator
    blocks/   CvHero, CvAbout, CvExperience, CvEducation, CvSkills, DownloadCard,
              QuestionWidget, BriefCard, PriorityWidget, MatchReport
    ui/       # сгенерированные shadcn-vue компоненты
  composables/
    useCvChat.ts            # обёртка над Chat из @ai-sdk/vue: scenario, locale, транспорт
    useLocalScenarios.ts    # showCv(), downloadCv()
    useVacancyUpload.ts     # выбор файла, валидация, POST /api/parse-vacancy
  lib/block-registry.ts     # part.type → компонент
i18n/locales/en.json, ru.json
public/cv/Alexandr_Kozikov_en.pdf, Alexandr_Kozikov_ru.pdf, photo.webp
```

UX-детали:
- Чат начинается с приветствия ассистента (эффект печати) и карточек быстрых действий; после первого действия
  быстрые кнопки остаются компактными чипами над инпутом.
- Инпут: textarea с авто-ростом, Enter — отправить, Shift+Enter — перенос; слева скрепка
  (accept `.pdf,.docx,.md,.txt`), drag&drop файла на окно; справа send / stop (во время стрима).
- Пока ждём ответ на клиентский tool, инпут не блокируется — пользователь может ответить текстом.
- Кнопка «Сбросить чат» — в TopBar.
- История чата — только в `localStorage` (`app/lib/chat-history.ts`), «Сбросить чат» её очищает.
  Хранится сериализованный список сообщений с версией схемы; при несовпадении версии — сброс.
- Смена языка посреди диалога: UI переводится, новые ответы агента идут на новом языке.

SSR: рендерим каркас, приветствие и мета-теги. Чат — клиентский. Для SEO отдельная `/cv`
страница + `og:image` + JSON-LD `Person`.

---

## 7. Принятые решения (2026-10-29)

1. **Позиционирование — Fullstack (T-shaped)**: основная экспертиза — фронтенд, плюс бэкенд.
   Промпт агента и Hero говорят «Fullstack Engineer с сильной фронтенд-экспертизой».
   Тексты CV (EN/RU) владелец готовит сам.
2. **RU-версия резюме** есть, владелец добавит сам. Исполнитель кладёт плейсхолдеры по схеме.
3. **Заявки в Telegram — в основном плане** (см. §8).
4. **История чата — только localStorage**, без БД и без отправки на сервер.
5. **Бюджет LLM — ~$10** с возможностью увеличить (см. §9).

---

## 8. Заявки в Telegram

- После `BriefCard` и `MatchReport` есть CTA «Отправить Александру». Он открывает небольшую форму:
  имя, контакт (Telegram / email), компания, комментарий — все поля, кроме контакта, необязательные.
- Отправляем **только по явному клику** пользователя, без автоотправки (приватность и спам).
- `POST /api/lead` → валидация по zod → rate limit (строже чатового) → Telegram Bot API
  `sendMessage` в `TELEGRAM_CHAT_ID` с отформатированной сводкой (бриф / score + ключевые
  пробелы + контакт).
- Honeypot-поле от ботов. Ответ клиенту — `ok` или ошибка; в чате появляется подтверждение.

---

## 9. Бюджет и защита от расхода

При ~$10 главное — чтобы бот или злоумышленник не сжёг лимит за вечер. Защита в несколько слоёв:

1. **Лимит кредитов на ключ в OpenRouter** (в настройках ключа) — жёсткий потолок, который нельзя
   обойти багом в коде. Ставит владелец.
2. **Лимит на IP** (Upstash): например, 15 запросов / 10 мин и 60 / сутки.
3. **Глобальный дневной лимит** (Upstash-счётчик): например, 500 LLM-запросов в сутки. При
   превышении — дружелюбное сообщение и предложение скачать PDF / написать в Telegram.
4. **Лимиты на запрос**: история обрезается до последних N сообщений, `maxOutputTokens`,
   текст вакансии ≤ ~30k символов, `stopWhen` ограничивает число шагов агента.
5. **Модель** — недорогая, с надёжным tool calling и structured outputs; выбирается env-переменной,
   замена без деплоя кода. Конкретную модель подбираем в T5 по актуальным ценам OpenRouter.

Ориентир: при одном сравнении с вакансией ≈ 10–15k входных токенов на недорогой модели $10 хватит
на тысячи диалогов.
