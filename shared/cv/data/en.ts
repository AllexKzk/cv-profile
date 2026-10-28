import type { CvTextsInput } from '../schema'

// Texts are carried over from the PDF CV. TODO(owner): rewrite for the fullstack positioning
export const en = {
  title: 'Fullstack Engineer',
  about: [
    'Engineer with 5+ years of experience in B2B and enterprise products. TypeScript and Vue/Nuxt are my go-to stack, and I also work with React/Next.js.',
    'I love it when I can do more than just close tickets — when I get to have a real say in how things get built: pitch UX and product improvements, talk architecture. I keep things maintainable through docs, clean code, and test coverage. When needed, I set up processes for epics and run onboarding.',
    'My fullstack background helps me see the product as a whole — spot different solutions and weigh their trade-offs and cost.',
  ],
  experience: {
    'orion-soft': {
      role: 'Senior Frontend Engineer',
      summary: 'Building B2B products for IT infrastructure. I own the frontend of a container orchestration platform (Kubernetes), maintain a secrets management service (Vault) and build apps that support these products.',
      highlights: [
        'Delivered a redesign of the flagship product to match the new product-family design system. Set up an Agile workflow for a team of 5: in 6 months we revamped the UI, improved UX, and shipped new features.',
        'Wrote product documentation and built a micro-frontend plugin template — it made onboarding and feature development way faster.',
        'Audited project dependencies and patched 500+ high-severity vulnerabilities.',
        'Take part in epic planning, code reviews, onboarding, and architecture/UX discussions.',
      ],
    },
    'cyno-one': {
      role: 'Middle Frontend Engineer',
      summary: 'Outsourcing / outstaff agency. I got to work on both extending enterprise systems and shipping apps from scratch.',
      highlights: [
        'Shipped three Telegram Mini Apps on a shared design system. Led the frontend in a Waterfall setup — from locking requirements and architecture through MVP to handoff to support.',
        'Used Lighthouse to tune LCP, FCP, and CLS by ~30%.',
        'Brought SEO scores up to 100% and wired in Google Analytics.',
        'Hooked up AWS S3 with pre-signed URLs for media.',
        'Built a streaming chat UI for an LLM (SSE, typewriter effect).',
        'Worked with Lottie animations, crafted game-like flows in CSS and JS.',
      ],
    },
    'etu-leti-is': {
      role: 'Junior Fullstack Engineer',
      summary: 'University digitization unit: moved paper/document workflows into strict web forms with validated, consistent data.',
      highlights: [
        'Built a hierarchical table with lazy loading for recursive/tree data — cut LCP by ~3s and eased load on the client.',
        'Under the tech lead, helped design a scalable architecture, the database layer, and the split between backend and frontend apps.',
        'Collected user feedback on bugfixes and feature work.',
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
    main: 'Main stack',
    also: 'Also',
    backend: 'Backend',
    ui: 'UI',
    api: 'API & architecture',
    testing: 'Testing & quality',
    tools: 'Tools',
    ai: 'AI',
  },
  // TODO(owner): not in the PDF yet
  languages: [],
} satisfies CvTextsInput
