import type { MouseEvent } from 'react'
import { getTech } from './expertiseData'

/**
 * EXPERTISE PHONE PANELS — the six mobile compositions' markup (<= 767px).
 *
 * PHONES ONLY. The tree is always mounted inside `.expertise` so a
 * breakpoint crossing can never remount content mid-exit, but the phone
 * stylesheet (responsive/expertise-mobile.css) hides it at >= 768px with
 * `display: none`, so the approved tablet/desktop scene keeps rendering
 * its own untouched composition below the fold of this file.
 *
 * The six compositions (task spec — the ONE authorized mobile copy):
 *
 *     0  Opening        03 / TECHNOLOGIES I USE + Modern tools. /
 *                      Practical websites. + supporting paragraph + cue
 *     1  01 / FRONTEND           HTML · CSS · JavaScript · TypeScript
 *     2  02 / FRAMEWORKS         React · Next.js
 *     3  03 / BACKEND & DATA     Node.js · MongoDB · Prisma
 *     4  04 / DESIGN & DEPLOYMENT  Figma · Vercel · SEO
 *     5  Closing        "The right tools for real results." + paragraph
 *                      + four abstract line icons + View My Work CTA
 *
 * No Supabase, no extra technologies, no invented destinations: every
 * logo resolves through `getTech` to the same genuine local SVG assets
 * the desktop network already uses, and the CTA points at the same
 * `#work` anchor the Hero CTA ("View My Work") and the navbar WORK link
 * already use — the project's existing Work navigation behaviour.
 *
 * The panels carry NO animation of their own: they are plain, always-
 * composed cells of the track that `AboutPanelTrack`'s Expertise sibling
 * (`ExpertiseMobileTrack`) translates horizontally from the shared
 * progress. Reveal-in-place ramps inside a sliding panel would double
 * the horizontal movement, so a composition enters as one whole — fully
 * readable the moment its panel settles.
 */

/**
 * Click guard: identical to the Hero CTA's `holdTarget` (which the
 * component doc credits as a deliberate duplicate of the Navbar rule) —
 * a bare anchor must not navigate while ScrollTrigger owns the pin, but
 * a click on a target that exists should keep its native behaviour. The
 * guard is duplicated rather than shared because Expertise must not
 * depend on Hero internals, for the same reason Hero restates it.
 */
function holdTarget(event: MouseEvent<HTMLAnchorElement>) {
  const href = event.currentTarget.getAttribute('href')
  const targetId = href?.startsWith('#') ? href.slice(1) : ''
  if (targetId && !document.getElementById(targetId)) {
    event.preventDefault()
  }
}

/** One category composition. `tech` ids resolve via `getTech`. */
type PhoneCategory = {
  code: string
  label: string
  description: string
  techs: string[]
  benefits: string[]
}

/** The four technology categories, in scroll order, spec copy verbatim. */
const CATEGORIES: readonly PhoneCategory[] = [
  {
    code: '01',
    label: 'Frontend',
    description: 'Build responsive and interactive interfaces.',
    techs: ['html', 'css', 'javascript', 'typescript'],
    benefits: [
      'Clean and semantic code',
      'Responsive across all devices',
      'Modern UI/UX practices',
      'Focused on performance',
    ],
  },
  {
    code: '02',
    label: 'Frameworks',
    description: 'Build modern web applications.',
    techs: ['react', 'next'],
    benefits: [
      'Component based development',
      'Scalable project structure',
      'Optimized for performance',
      'Production ready websites',
    ],
  },
  {
    code: '03',
    label: 'Backend & Data',
    description: 'Server-side logic and data management.',
    techs: ['node', 'mongodb', 'prisma'],
    benefits: [
      'Secure and scalable backend',
      'Efficient database design',
      'Clean API development',
      'Ready for real world use',
    ],
  },
  {
    code: '04',
    label: 'Design & Deployment',
    description: 'Design, plan and deploy with confidence.',
    techs: ['figma', 'vercel', 'seo'],
    benefits: [
      'Design user focused experiences',
      'Smooth deployment process',
      'Better visibility and performance',
      'Websites that grow with your business',
    ],
  },
]

/**
 * The closing composition's four abstract line icons — code, data,
 * design and performance. 20x20 outlined strokes drawn in the SAME
 * vocabulary as the existing principle icons (`expertise__principle-icon`
 * CSS: no fill, 1.4 stroke, round caps): the bolt and the brackets reuse
 * exactly those existing paths' geometry, the data cylinder and the
 * design crop-frame are two new marks in the same hand. No icon package.
 */
const CLOSING_ICONS: readonly { id: string; d: string[] }[] = [
  {
    // performance — bolt (the principle icon's own path, as-is).
    id: 'performance',
    d: ['M10.8 1.7L2.5 11.7h7.5L9.2 18.3 17.5 8.3H10z'],
  },
  {
    // data — a slim database cylinder.
    id: 'data',
    d: [
      'M10 2.6c3.6 0 6.4 1 6.4 2.3v10.2c0 1.3-2.8 2.3-6.4 2.3s-6.4-1-6.4-2.3V4.9c0-1.3 2.8-2.3 6.4-2.3z',
      'M3.6 4.9c0 1.3 2.8 2.3 6.4 2.3s6.4-1 6.4-2.3',
      'M3.6 10c0 1.3 2.8 2.3 6.4 2.3s6.4-1 6.4-2.3',
    ],
  },
  {
    // design — a crop-frame: six hairline selectors bound by a centre rule.
    id: 'design',
    d: [
      'M7.1 3.2v9.7h9.7',
      'M13 17.5V7.8H3.3',
      'M16.8 3.2v3.9M3.2 16.8h3.9M16.8 16.8h-3.9M3.2 3.2h3.9',
    ],
  },
  {
    // code — brackets plus a centre slash (the principle icon's brackets).
    id: 'code',
    d: ['M6.4 5.6L2.9 10l3.5 4.4M13.6 5.6L17.1 10l-3.5 4.4', 'M11.1 4l-2.2 12'],
  },
] as const

export function ExpertisePhonePanels() {
  return (
    <>
      {/* 0 — OPENING: the `03 — TECHNOLOGIES I USE` lockup, the two-line serif
              headline and the supporting paragraph, bottom-anchored so the
              portrait keeps its lane. The cue mirrors the hero's SCROLL
              indicator (the hero cue itself fades out while the scene is
              active, see mobile.css). The first three strings reuse the
              desktop text-group classes so the established type roles and
              the <= 900px wash/scrim rules apply unchanged. */}
      <div className="expertise-mobile__panel" data-panel="0">
        <div className="expertise__text-group expertise-mobile__intro">
          <div className="expertise__meta">
            <span className="expertise__num">03</span>
            <span className="expertise__label">Technologies I use</span>
          </div>
          <h2 className="expertise__headline">
            <span>Modern tools.</span>
            <span className="expertise__accent">Practical websites.</span>
          </h2>
          <p className="expertise__para">
            I use a focused set of modern technologies to design and develop
            websites that are fast, reliable and built for real business
            needs.
          </p>
        </div>
        <div className="expertise-mobile__cue" aria-hidden="true">
          <span className="expertise-mobile__cue-line">
            <span className="expertise-mobile__cue-dot" />
          </span>
          <span className="expertise-mobile__cue-label">Scroll</span>
        </div>
      </div>

      {/* 1–4 — the four technology categories. One shared emerald-glass card
              template: outlined circular number, title + description, a one
              row of genuine logo tiles, then a hairline divider and the four
              benefit rows. */}
      {CATEGORIES.map((cat, i) => (
        <div className="expertise-mobile__panel" data-panel={String(i + 1)} key={cat.code}>
          <article className="expertise-mobile__card">
            <div className="expertise-mobile__head">
              <span className="expertise-mobile__no" aria-hidden="true">
                {cat.code}
              </span>
              <div className="expertise-mobile__headtext">
                <h3 className="expertise-mobile__title">{cat.label}</h3>
                <p className="expertise-mobile__desc">{cat.description}</p>
              </div>
            </div>
            <div className="expertise-mobile__tiles">
              {cat.techs.map((tid) => {
                const t = getTech(tid)
                return (
                  <div className="expertise-mobile__tile" key={t.id}>
                    <img
                      className="expertise-mobile__tile-logo"
                      src={t.logo}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                    />
                    <span className="expertise-mobile__tile-name">{t.name}</span>
                  </div>
                )
              })}
            </div>
            <ul className="expertise-mobile__benefits">
              {cat.benefits.map((benefit) => (
                <li className="expertise-mobile__benefit" key={benefit}>
                  {benefit}
                </li>
              ))}
            </ul>
          </article>
        </div>
      ))}

      {/* 5 — CLOSING: summary headline + paragraph, four abstract line
          icons, and the outlined CTA to the existing Work anchor. */}
      <div className="expertise-mobile__panel" data-panel="5">
        <div className="expertise-mobile__closing">
          <h2 className="expertise-mobile__closing-headline">
            The right tools for&nbsp;real&nbsp;results.
          </h2>
          <p className="expertise-mobile__closing-para">
            A combination of modern technologies, thoughtful design and clean
            development to create websites that perform, scale and make a
            real impact.
          </p>
          <div className="expertise-mobile__icons" aria-hidden="true">
            {CLOSING_ICONS.map((icon) => (
              <span className="expertise-mobile__icon" key={icon.id}>
                <svg viewBox="0 0 20 20" fill="none" focusable="false">
                  {icon.d.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </svg>
              </span>
            ))}
          </div>
          <a
            className="expertise-mobile__cta ui-layer--interactive"
            href="#work"
            onClick={holdTarget}
          >
            <span>View My Work</span>
            <svg
              className="expertise-mobile__cta-arrow"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M1.75 6h8.5M7.25 3 10.25 6l-3 3"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="square"
              />
            </svg>
          </a>
        </div>
      </div>
    </>
  )
}
