/**
 * EXPERTISE — technology ecosystem data (single source of truth)
 * --------------------------------------------------------------------------
 * ONLY the 13 confirmed technologies from the task brief, grouped into the
 * eight confirmed categories. No unconfirmed technology appears anywhere.
 *
 * LOGO ASSETS
 * Every branded technology points at a GENUINE, locally-stored SVG logo in
 * public/brand/technology/ (no runtime CDN, no invented artwork):
 *   html5 · css3 · javascript · typescript · react · nodejs · mongodb ·
 *   supabase · figma   → original full-colour brand marks (devicon originals)
 *   nextjs · vercel    → Single-colour brand paths rendered in the light
 *                        on-dark variant (the marks are black by default)
 *   prisma             → genuine brand path, light on-dark variant
 *   seo                → a deliberately designed SEO search/analytics mark
 *                        (SEO is a capability, not a single software brand)
 *
 * GEOMETRY
 * Category groups are positioned as top-left percentages of the measured
 * network field box (0..100 on each axis). That field is aspect-ratio locked to
 * the TARGET frame (400 x 372, see `.expertise__field` in expertise.css), so the
 * constellation keeps the target's proportions on any screen. Individual
 * technology endpoints are NOT hard-coded: their centres are measured from the
 * live DOM at runtime, so the SVG connectors can never detach from their tiles.
 */

/*
 * Resolve a public/ asset against Vite's deploy base. A literal '/brand/...'
 * path pins to the domain root and 404s under a subpath deploy (GitHub Pages
 * serves this site at /My-website/); BASE_URL resolves correctly in both dev
 * and the production build.
 */
const pub = (path: string): string => `${import.meta.env.BASE_URL}${path}`

export type ClusterId =
  | 'frontend'
  | 'frameworks'
  | 'backend'
  | 'database'
  | 'baas'
  | 'deployment'
  | 'design'
  | 'seo'

export type Tech = {
  /** Stable endpoint id used by the connector graph. */
  id: string
  /** Exact confirmed technology name — the tile wordmark. */
  name: string
  /** Locally-stored genuine logo asset (public/brand/technology). */
  logo: string
  /** Legitimate brand colour, used only as a restrained tile accent. */
  brand: string
}

export type Category = {
  id: ClusterId
  label: string
  description: string
  /** Technology ids in this category (exact confirmed names only). */
  techs: readonly string[]
  /** Field-relative anchor (top-left), percent of the measured field box. */
  x: number
  y: number
  /** Panel width, percent of the measured field box. */
  w: number
  /** Panel height, percent of the measured field box. */
  h: number
}

/** The 13 confirmed technologies, each with a genuine local logo asset. */
export const TECHS: readonly Tech[] = [
  { id: 'html', name: 'HTML', logo: pub('brand/technology/html5.svg'), brand: '#e34f26' },
  { id: 'css', name: 'CSS', logo: pub('brand/technology/css3.svg'), brand: '#1572b6' },
  { id: 'javascript', name: 'JavaScript', logo: pub('brand/technology/javascript.svg'), brand: '#f7df1e' },
  { id: 'typescript', name: 'TypeScript', logo: pub('brand/technology/typescript.svg'), brand: '#3178c6' },
  { id: 'react', name: 'React', logo: pub('brand/technology/react.svg'), brand: '#61dafb' },
  { id: 'next', name: 'Next.js', logo: pub('brand/technology/nextjs.svg'), brand: '#e8edeb' },
  { id: 'node', name: 'Node.js', logo: pub('brand/technology/nodejs.svg'), brand: '#5fa04e' },
  { id: 'mongodb', name: 'MongoDB', logo: pub('brand/technology/mongodb.svg'), brand: '#47a248' },
  { id: 'prisma', name: 'Prisma', logo: pub('brand/technology/prisma.svg'), brand: '#8e9bb3' },
  { id: 'supabase', name: 'Supabase', logo: pub('brand/technology/supabase.svg'), brand: '#3ecf8e' },
  { id: 'vercel', name: 'Vercel', logo: pub('brand/technology/vercel.svg'), brand: '#e8edeb' },
  { id: 'figma', name: 'Figma', logo: pub('brand/technology/figma.svg'), brand: '#f24e1e' },
  { id: 'seo', name: 'SEO', logo: pub('brand/technology/seo.svg'), brand: '#50e3a4' },
] as const

export const TECH_MAP: Record<string, Tech> = Object.fromEntries(
  TECHS.map((t) => [t.id, t]),
)

/** Strict lookup for the handful of known ids used across the scene. */
export function getTech(id: string): Tech {
  const t = TECH_MAP[id]
  if (!t) throw new Error(`Unknown technology id: ${id}`)
  return t
}

/**
 * Eight categories arranged around the central code core:
 *
 *   TOP     · FRONTEND FOUNDATIONS (upper-left, widest)  +  FRAMEWORKS (upper-right)
 *   MIDDLE  · BACKEND (left)        +  core (centre)      +  DATABASE & ORM (right)
 *   BOTTOM  · DEPLOYMENT · DESIGN · BACKEND-AS-A-SERVICE · OPTIMIZATION
 *
 * x / y / w / h are percentages of the field box, MEASURED FROM THE TARGET
 * IMAGE (field = the box from the FRONTEND panel's top-left corner to the
 * OPTIMIZATION panel's right edge / DESIGN panel's bottom edge). The panels are
 * real boxes (expertise.css makes them border-box), so what you see here is
 * exactly the size on screen.
 */
export const CATEGORIES: readonly Category[] = [
  {
    id: 'frontend',
    label: 'FRONTEND FOUNDATIONS',
    description: 'Build responsive, interactive interfaces.',
    techs: ['html', 'css', 'javascript', 'typescript'],
    x: 15.4,
    y: 0,
    w: 42.3,
    h: 26.9,
  },
  {
    id: 'frameworks',
    label: 'FRAMEWORKS',
    description: 'Build component-based web experiences.',
    techs: ['react', 'next'],
    x: 60,
    y: 3.8,
    w: 26.2,
    h: 23.9,
  },
  {
    id: 'backend',
    label: 'BACKEND',
    description: 'Server-side logic and APIs.',
    techs: ['node'],
    x: 0,
    y: 34.9,
    w: 22.69,
    h: 24.4,
  },
  {
    id: 'database',
    label: 'DATABASE & ORM',
    description: 'Structure and access application data.',
    techs: ['mongodb', 'prisma'],
    x: 62.7,
    y: 35.4,
    w: 26.16,
    h: 28.13,
  },
  {
    id: 'deployment',
    label: 'DEPLOYMENT',
    description: 'Deploy and maintain web applications.',
    techs: ['vercel'],
    x: 0,
    y: 70.9,
    w: 21.49,
    h: 23.11,
  },
  {
    id: 'design',
    label: 'DESIGN',
    description: 'Plan and communicate visual direction.',
    techs: ['figma'],
    x: 23.17,
    y: 75,
    w: 25.17,
    h: 27.07,
  },
  {
    id: 'baas',
    label: 'BACKEND-AS-A-SERVICE',
    description: 'Backend services for supported project needs.',
    techs: ['supabase'],
    x: 50.94,
    y: 74.7,
    w: 25.17,
    h: 27.07,
  },
  {
    id: 'seo',
    label: 'OPTIMIZATION',
    description: 'Improve discoverability through search optimization.',
    techs: ['seo'],
    x: 78.1,
    y: 72,
    w: 21.49,
    h: 23.11,
  },
] as const

/**
 * The central code-core, anchored by its top-left corner on the same normalised
 * system as the categories. The orbit rings are centred on the core's own
 * measured centre at runtime.
 */
export const CORE = { x: 31.25, y: 43.8, w: 18, h: 23.5 }

/** 'core' is the implicit centre endpoint; everything else is a tech id. */
export type Endpoint = 'core' | string

/** Connected topology: core spokes, intra-category meshes, cross links. */
export const EDGES: readonly (readonly [Endpoint, Endpoint])[] = [
  ['core', 'html'],
  ['core', 'react'],
  ['core', 'node'],
  ['core', 'mongodb'],
  ['core', 'supabase'],
  ['core', 'vercel'],
  ['core', 'figma'],
  ['core', 'seo'],
  ['html', 'css'],
  ['css', 'javascript'],
  ['javascript', 'typescript'],
  ['react', 'next'],
  ['mongodb', 'prisma'],
  ['css', 'react'],
  ['typescript', 'next'],
  ['node', 'prisma'],
  ['mongodb', 'supabase'],
  ['supabase', 'vercel'],
  ['seo', 'javascript'],
  ['figma', 'css'],
] as const

/** A subset of edges that carry a travelling signal pulse. */
export const PULSES: readonly (readonly [Endpoint, Endpoint])[] = [
  ['core', 'react'],
  ['core', 'node'],
  ['core', 'mongodb'],
  ['css', 'react'],
  ['node', 'prisma'],
  ['supabase', 'vercel'],
] as const

/**
 * A handful of cross-links that carry a small junction node at their midpoint —
 * deliberate intersection points that give the graph topology a little
 * structure.
 */
export const JUNCTIONS: readonly (readonly [Endpoint, Endpoint])[] = [
  ['css', 'react'],
  ['typescript', 'next'],
  ['node', 'prisma'],
  ['mongodb', 'supabase'],
  ['figma', 'css'],
] as const

/** The four left-hand principles (exact copy, compact horizontal tiles). */
export const PRINCIPLES: readonly {
  id: string
  title: string
  text: string
}[] = [
  { id: 'focused', title: 'Focused', text: 'I use tools I can genuinely work with.' },
  { id: 'practical', title: 'Practical', text: 'Chosen for the needs of the project.' },
  { id: 'modern', title: 'Modern', text: 'Built for today\u2019s web.' },
  { id: 'honest', title: 'Honest', text: 'Clear about what I can deliver.' },
] as const

/** The bottom Real-World Use Cases workflow strip (six illustrative stages). */
export const WORKFLOW: readonly {
  id: string
  label: string
  tool: string
  tech: string
}[] = [
  { id: 'design', label: 'Design', tool: 'Figma', tech: 'figma' },
  { id: 'frontend', label: 'Frontend', tool: 'React / Next.js', tech: 'react' },
  { id: 'backend', label: 'Backend', tool: 'Node.js', tech: 'node' },
  {
    id: 'database',
    label: 'Database',
    tool: 'MongoDB / Prisma / Supabase',
    tech: 'mongodb',
  },
  { id: 'deploy', label: 'Deploy', tool: 'Vercel', tech: 'vercel' },
  { id: 'grow', label: 'Grow', tool: 'SEO', tech: 'seo' },
] as const

/**
 * The expertise progress rail. The page has ONE stable final Expertise state
 * rather than five genuinely separate scrolled stages, so OVERVIEW is the rail's
 * single active milestone in the final view (no invented sub-pages).
 */
export const RAIL_ITEMS: readonly string[] = [
  'OVERVIEW',
  'TECH STACK',
  'PROCESS',
  'WHY THIS STACK',
  'CLOSING',
] as const
