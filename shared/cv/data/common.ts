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
      ru: '/cv/Alexandr_Kozikov_ru.pdf',
    },
  },
  experience: [
    {
      id: 'orion-soft',
      company: 'ORION SOFT',
      start: '2024-10',
      end: null,
      stack: ['TypeScript', 'React', 'Redux', 'MUI', 'SCSS', 'GraphQL', 'Cypress', 'Kubernetes', 'Vue', 'Git', 'Docker'],
    },
    {
      id: 'cyno-one',
      company: 'CYNO.ONE',
      start: '2022-07',
      end: '2024-10',
      stack: ['TypeScript', 'React', 'Next.js', 'Redux Toolkit', 'Zustand', 'Vue', 'Nuxt', 'Pinia', 'Tailwind', 'SCSS'],
    },
    {
      id: 'etu-leti-is',
      company: 'ETU LETI IS',
      start: '2021-04',
      end: '2022-07',
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
        { name: 'Vue', aliases: ['Vue.js', 'VueJS', 'Vue 3'], main: true },
        { name: 'Nuxt', aliases: ['Nuxt.js', 'NuxtJS'], main: true },
        { name: 'Pinia', main: true },
        { name: 'Vuex', main: true },
        { name: 'HTML5', aliases: ['HTML'], main: true },
        { name: 'CSS3', aliases: ['CSS'], main: true },
        { name: 'SCSS', aliases: ['Sass'], main: true },
      ],
    },
    {
      id: 'also',
      items: [
        { name: 'JavaScript', aliases: ['JS', 'ES6'] },
        { name: 'React', aliases: ['React.js', 'ReactJS'] },
        { name: 'Next.js', aliases: ['Next', 'NextJS'] },
        { name: 'Redux Toolkit', aliases: ['Redux', 'RTK'] },
        { name: 'Zustand' },
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
      id: 'ui',
      items: [
        { name: 'Tailwind', aliases: ['Tailwind CSS', 'TailwindCSS'] },
        { name: 'shadcn/ui', aliases: ['shadcn', 'shadcn-vue'] },
        { name: 'MUI', aliases: ['Material UI'] },
        { name: 'Bootstrap' },
        { name: 'PatternFly' },
      ],
    },
    {
      id: 'api',
      items: [
        { name: 'REST API', aliases: ['REST'] },
        { name: 'GraphQL' },
        { name: 'WebSockets', aliases: ['WebSocket', 'WS'] },
        { name: 'Micro-frontends', aliases: ['Microfrontends', 'MFE', 'Module Federation'] },
      ],
    },
    {
      id: 'testing',
      items: [
        { name: 'Jest' },
        { name: 'Cypress' },
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
      id: 'ai',
      items: [
        { name: 'Cursor' },
        { name: 'Ollama' },
        { name: 'Claude' },
      ],
    },
  ],
  updatedAt: '2026-10',
} satisfies CvCommonInput
