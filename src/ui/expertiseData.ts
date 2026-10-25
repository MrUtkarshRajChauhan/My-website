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
 * the TARGET frame (400 x 370, see `.expertise__field` in expertise.css), so the
 * constellation keeps the target's proportions on any screen. Individual
 * technology endpoints are NOT hard-coded: their centres are measured from the
 * live DOM at runtime, so the SVG connectors can never detach from their tiles.
 */

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
  { id: 'html', name: 'HTML', logo: '/brand/technology/html5.svg', brand: '#e34f26' },
  { id: 'css', name: 'CSS', logo: '/brand/technology/css3.svg', brand: '#1572b6' },
  { id: 'javascript', name: 'JavaScript', logo: '/brand/technology/javascript.svg', brand: '#f7df1e' },
  { id: 'typescript', name: 'TypeScript', logo: '/brand/technology/typescript.svg', brand: '#3178c6' },
  { id: 'react', name: 'React', logo: '/brand/technology/react.svg', brand: '#61dafb' },
  { id: 'next', name: 'Next.js', logo: '/brand/technology/nextjs.svg', brand: '#e8edeb' },
  { id: 'node', name: 'Node.js', logo: '/brand/technology/nodejs.svg', brand: '#5fa04e' },
  { id: 'mongodb', name: 'MongoDB', logo: '/brand/technology/mongodb.svg', brand: '#47a248' },
  { id: 'prisma', name: 'Prisma', logo: '/brand/technology/prisma.svg', brand: '#8e9bb3' },
  { id: 'supabase', name: 'Supabase', logo: '/brand/technology/supabase.svg', brand: '#3ecf8e' },
  { id: 'vercel', name: 'Vercel', logo: '/brand/technology/vercel.svg', brand: '#e8edeb' },
  { id: 'figma', name: 'Figma', logo: '/brand/technology/figma.svg', brand: '#f24e1e' },
  { id: 'seo', name: 'SEO', logo: '/brand/technology/seo.svg', brand: '#50e3a4' },
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
 *   TOP     · FRONTEND (upper-left, widest)  +  FRAMEWORKS (upper-right)
 *   MIDDLE  · BACKEND (left)        +  core (centre)      +  DATABASE & ORM (right)
 *   BOTTOM  · DEPLOYMENT · DESIGN · DATABASE (BaaS) · OPTIMIZATION
 *
 * x / y / w / h are percentages of the field box, MEASURED FROM THE TARGET
 * IMAGE (field = 400 x 370 units: from the FRONTEND panel's top edge to the
 * DESIGN panel's bottom edge, DEPLOYMENT's left edge to OPTIMIZATION's right edge). The panels are
 * real boxes (expertise.css makes them border-box), so what you see here is
 * exactly the size on screen.
 */
export const CATEGORIES: readonly Category[] = [
  {
    id: 'frontend',
    label: 'FRONTEND',
    description: 'Build responsive\nand interactive interfaces.',
    techs: ['html', 'css', 'javascript', 'typescript'],
    x: 15.5,
    y: 0,
    w: 41.5,
    h: 24.3,
  },
  {
    id: 'frameworks',
    label: 'FRAMEWORKS',
    description: 'Build modern web\napplications.',
    techs: ['react', 'next'],
    x: 59.75,
    y: 1.9,
    w: 26.75,
    h: 25.1,
  },
  {
    id: 'backend',
    label: 'BACKEND',
    description: 'Server-side logic\nand APIs.',
    techs: ['node'],
    x: 6.5,
    y: 34.1,
    w: 21.25,
    h: 26.2,
  },
  {
    id: 'database',
    label: 'DATABASE & ORM',
    description: 'Store and manage\nyour data efficiently.',
    techs: ['mongodb', 'prisma'],
    x: 62.5,
    y: 35.7,
    w: 27.25,
    h: 27.8,
  },
  {
    id: 'deployment',
    label: 'DEPLOYMENT',
    description: 'Deploy and scale\nwith confidence.',
    techs: ['vercel'],
    x: 0,
    y: 69.2,
    w: 21.5,
    h: 27.0,
  },
  {
    id: 'design',
    label: 'DESIGN',
    description: 'Design and plan\nbetter experiences.',
    techs: ['figma'],
    x: 24.5,
    y: 73.5,
    w: 22.0,
    h: 26.5,
  },
  {
    id: 'baas',
    label: 'DATABASE (BaaS)',
    description: 'Real-time features\nwith less setup.',
    techs: ['supabase'],
    x: 49.25,
    y: 72.7,
    w: 26.0,
    h: 27.3,
  },
  {
    id: 'seo',
    label: 'OPTIMIZATION',
    description: 'Improve visibility\nand performance.',
    techs: ['seo'],
    x: 78.25,
    y: 70.5,
    w: 21.75,
    h: 25.9,
  },
] as const

/**
 * The central code-core, anchored by its top-left corner on the same normalised
 * system as the categories. The orbit rings are centred on the core's own
 * measured centre at runtime.
 */
export const CORE = { x: 31.5, y: 40.5, w: 21.5, h: 26.5 }

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

/** The four left-hand principles (exact target copy, compact horizontal tiles). */
export const PRINCIPLES: readonly {
  id: string
  title: string
  text: string
}[] = [
  { id: 'focused', title: 'Focused', text: 'Only the tools I truly work with.' },
  { id: 'practical', title: 'Practical', text: 'Used in real projects.' },
  { id: 'modern', title: 'Modern', text: 'Built for today and tomorrow.' },
  {
    id: 'client-ready',
    title: 'Client Ready',
    text: 'Reliable, maintainable and scalable.',
  },
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
