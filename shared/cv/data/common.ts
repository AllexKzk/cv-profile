import type { CvCommonInput } from '../schema'

export const common = {
  person: {
    name: {
      en: 'Alexandr Kozikov',
      ru: 'Александр Козиков',
    },
    photo: '/cv/photo.webp',
    timezone: 'GMT+3',
    openTo: ['remote', 'hybrid', 'relocation'],
  },
  contacts: {
    email: 'allexkzkwork@gmail.com',
    telegram: 'https://t.me/allexkzk',
    linkedin: 'https://www.linkedin.com/in/alexkzk/',
    github: 'https://github.com/AllexKzk',
    site: 'https://allexkzk.dev',
  },
  files: {
    pdf: {
      en: '/cv/Alexandr_Kozikov_en.pdf',
      // TODO(owner): '/cv/Alexandr_Kozikov_ru.pdf' once the Russian PDF is added
      ru: '/cv/Alexandr_Kozikov_en.pdf',
    },
  },
  experience: [
    {
      id: 'orion-soft',
      company: 'Orion Soft',
      url: 'https://www.orionsoft.ru/',
      start: '2024-10',
      end: null,
      products: [
        { id: 'nova', name: 'Nova', url: 'https://www.orionsoft.ru/nova' },
        { id: 'cluster-manager', name: 'Cluster Manager', url: 'https://wiki.orionsoft.ru/nova/latest/admin-guide/cluster-manager/' },
        { id: 'starvault', name: 'StarVault', url: 'https://www.orionsoft.ru/starvault' },
      ],
      stack: ['TypeScript', 'Go', 'React', 'Redux', 'TanStack', 'Jest', 'Playwright', 'Vue', 'SCSS', 'GraphQL', 'Kubernetes', 'Module Federation', 'Webpack', 'Git', 'Docker'],
    },
    {
      id: 'cyno-one',
      company: 'CYNO.ONE',
      url: 'https://www.linkedin.com/company/cyno-one/',
      start: '2022-07',
      end: '2024-10',
      products: [
        { id: 'ton-tarot', name: 'TON Tarot', url: 'https://www.findmini.app/ru/tontarot_bot/' },
        { id: 'dogs', name: 'Dogs', url: 'https://www.findmini.app/dogs_dogshouse_bot/' },
        { id: 'gazprom', name: 'Gazprom Burenie' },
      ],
      stack: ['TypeScript', 'React', 'Next.js', 'Redux', 'TanStack', 'Zustand', 'Vue', 'Nuxt', 'Pinia', 'Tailwind', 'SCSS'],
    },
    {
      id: 'etu-leti-is',
      company: 'ETU LETI',
      url: 'https://www.linkedin.com/school/spbetu/',
      start: '2021-04',
      end: '2022-07',
      products: [
        { id: 'portfolio', name: 'Portfolio', url: 'https://digital.etu.ru/doku.php?id=portfolio:start' },
        { id: 'trajectories', name: 'Trajectories', url: 'https://digital.etu.ru/doku.php?id=iot:start' },
      ],
      stack: ['TypeScript', 'Vue', 'Pinia', 'SCSS', 'Bootstrap', 'NestJS', 'PostgreSQL', 'MongoDB', 'Jest'],
    },
  ],
  education: [
    { id: 'etu-leti', start: 2020, end: 2024 },
  ],
  skills: [
    {
      id: 'main',
      items: [
        { name: 'TypeScript', aliases: ['TS'], main: true },
        { name: 'React / Next.js', aliases: ['React', 'React.js', 'ReactJS', 'Next.js', 'Next', 'NextJS'], main: true },
        { name: 'Vue / Nuxt', aliases: ['Vue', 'Vue.js', 'VueJS', 'Vue 3', 'Nuxt', 'Nuxt.js', 'NuxtJS'], main: true },
        { name: 'HTML5', aliases: ['HTML'], main: true },
        { name: 'SCSS', aliases: ['Sass'], main: true },
      ],
    },
    {
      id: 'also',
      items: [
        { name: 'JavaScript', aliases: ['JS', 'ES6'] },
        { name: 'Redux Toolkit', aliases: ['Redux', 'RTK'] },
        { name: 'Zustand' },
        { name: 'TanStack', aliases: ['TanStack Query', 'React Query'] },
        { name: 'Vuex / Pinia', aliases: ['Vuex', 'Pinia'] },
        { name: 'CSS3', aliases: ['CSS'] },
      ],
    },
    {
      id: 'ui',
      items: [
        { name: 'Tailwind', aliases: ['Tailwind CSS', 'TailwindCSS'] },
        { name: 'shadcn/ui', aliases: ['shadcn', 'shadcn-vue'] },
        { name: 'MUI', aliases: ['Material UI'] },
        { name: 'Bootstrap' },
        { name: 'PatternFly' },
        { name: 'Storybook' },
      ],
    },
    {
      id: 'api',
      items: [
        { name: 'REST API', aliases: ['REST'] },
        { name: 'GraphQL' },
        { name: 'WebSocket', aliases: ['WebSockets', 'WS'] },
        { name: 'Micro-frontends', aliases: ['Microfrontends', 'MFE', 'Module Federation'] },
        { name: 'Monolith' },
      ],
    },
    {
      id: 'testing',
      items: [
        { name: 'Jest' },
        { name: 'Cypress' },
        { name: 'Playwright' },
        { name: 'Lighthouse' },
        { name: 'Core Web Vitals', aliases: ['CWV'] },
      ],
    },
    {
      id: 'tools',
      items: [
        { name: 'Vite' },
        { name: 'Webpack' },
        { name: 'Babel' },
        { name: 'Git' },
        { name: 'CI/CD', aliases: ['CI', 'CD'] },
        { name: 'Docker' },
        { name: 'Kubernetes', aliases: ['K8s'] },
      ],
    },
    {
      id: 'backend',
      items: [
        { name: 'Node.js', aliases: ['Node', 'NodeJS'] },
        { name: 'Express', aliases: ['Express.js'] },
        { name: 'NestJS', aliases: ['Nest'] },
        { name: 'PostgreSQL', aliases: ['Postgres'] },
        { name: 'MongoDB', aliases: ['Mongo'] },
        { name: 'Supabase' },
      ],
    },
    {
      id: 'ai',
      items: [
        { name: 'Claude Code' },
        { name: 'Claude Design' },
        { name: 'Cursor' },
        { name: 'Ollama' },
      ],
    },
  ],
  updatedAt: '2026-10',
} satisfies CvCommonInput
