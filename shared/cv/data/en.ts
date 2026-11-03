import type { CvTextsInput } from '../schema'

// Translated from the Russian CV (2026-10). TODO(owner): review the wording
export const en = {
  title: 'Senior Frontend Engineer',
  about: [
    '5+ years of experience in B2B and enterprise products.',
    'I love TypeScript, React and Vue. My fullstack background helps me see the product as a whole: different solutions, their trade-offs and cost.',
    'I value the chance to go beyond development: suggest product and UX improvements, design architecture and pipelines. When needed, I set up processes for epics and run onboarding.',
    'I use AI in development, have integrated agents into products and build AI-first apps.',
    'Open to remote, hybrid and relocation. Not considering i-gaming and military.',
  ],
  experience: {
    'orion-soft': {
      role: 'Senior Frontend Engineer',
      summary: 'Building B2B products for IT infrastructure.',
      products: {
        'nova': 'Kubernetes platform for enterprise infrastructure.',
        'cluster-manager': 'Management platform for Nova clusters in isolated environments.',
        'starvault': 'Secrets management and access protection platform.',
      },
      highlights: [
        { title: 'Introduced Intelligent UI for the product\'s AI agent' },
        {
          title: 'Rebuilt the feature delivery pipeline around Claude Code / Claude Design',
          details: 'Shortened the path from idea to release with AI and dropped the final Design Review stage.',
        },
        {
          title: 'Redesigned the main product',
          details: 'In six months we updated the design system, improved UX and shipped features: 100+ pages, 20 forms, 44 components.',
        },
        {
          title: 'Refactored legacy code',
          details: 'Removed unused modules — the bundle shrank by 50%. Migrated to React 18, webpack 5, TypeScript 5, Node 24. Updated unit tests, replaced Cypress e2e with Playwright: ~40% coverage.',
        },
      ],
    },
    'cyno-one': {
      role: 'Middle Frontend Engineer',
      summary: 'Worked both on extending enterprise systems and on launching apps from scratch.',
      products: {
        'ton-tarot': 'Telegram Mini App for AI tarot readings.',
        'dogs': 'Web 3.0 Telegram Mini App.',
        'gazprom': 'Account portal for Gazprom Burenie managers.',
      },
      highlights: [
        { title: 'Improved LCP / FCP / CLS by ~30% (Lighthouse)' },
        { title: 'Integrated AWS S3 with pre-signed URLs for media content' },
        { title: 'Built chat streaming (SSE) with ChatGPT' },
        { title: 'Worked with Lottie animations, built game scenarios in CSS and JS' },
      ],
    },
    'etu-leti-is': {
      role: 'Junior Fullstack Engineer',
      summary: 'University business process digitalization department: moving paperwork into strict web forms with consistent data.',
      products: {
        portfolio: 'App for collecting and entering academic achievements of students and staff.',
        trajectories: 'Workflow for curricula and course programs, building individual study paths for students.',
      },
      highlights: [
        {
          title: 'Built a hierarchical table with lazy loading for recursive data',
          details: 'LCP dropped by 3 seconds and the client load went down.',
        },
        { title: 'Under the lead\'s guidance, designed a scalable architecture, databases, backend and frontend apps' },
        { title: 'Collected user feedback on fixes and features' },
      ],
    },
  },
  education: {
    'etu-leti': {
      degree: 'Bachelor’s in Software Engineering',
      institution: 'Saint Petersburg Electrotechnical University “LETI”',
    },
  },
  skillGroups: {
    main: 'Main',
    also: 'Also',
    ui: 'UI',
    api: 'API & architecture',
    testing: 'Testing & quality',
    tools: 'Tools',
    backend: 'Backend',
    ai: 'AI',
  },
  languages: [
    { name: 'English', level: 'B2 (Upper-Intermediate)' },
  ],
} satisfies CvTextsInput
