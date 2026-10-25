import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * WORK 02 — CLIENT PERSPECTIVE (the testimonial chapter).
 *
 * WHERE IT SITS
 * A plain sibling of <Work /> in App: the same normal-flow position, the same
 * `--z-content` band and the same bare, transparent box. It therefore scrolls
 * over the ONE persistent fixed background (`.static-background`, mounted and
 * crossfaded in by <ExpertiseExitRunway />) exactly as Work 01 does, with no
 * second background layer, no second pin and nothing added to the cinematic
 * scroll distance.
 *
 * THE HANDOFF (one boundary timeline, no new bus)
 * Work 01's exit and this section's entrance share ONE paused-at-birth GSAP
 * timeline whose `progress()` IS the boundary progress `p ∈ [0,1]`:
 *
 *   p = 0  -> Work 01 at rest, this section entirely below the fold
 *   p = 1  -> Work 01 exited, this section's content settled in place
 *
 * The timeline is linked to a single, NON-pinning ScrollTrigger by
 * `scrub: true`, so ScrollTrigger writes the timeline progress directly from
 * the scroll position. That gives reversibility, correct placement on a
 * refresh at any intermediate scroll offset and no second trigger, timer or
 * bus — this is deliberately NOT routed through `progressBus` (cinematic
 * frames) or `expertiseExitBus` (the post-film runway).
 *
 * PROPERTY OWNERSHIP — strictly one writer per property.
 * Work 01's own scrubbed entrance already owns `.work__copy` and
 * `.work__showcase` (group y + autoAlpha). This timeline therefore never
 * touches those two boxes; it animates their CHILDREN instead:
 *   `.work__label` / `.work__title` / `.work__para`   -> exit group A
 *   `.work__ctas` + `.work__card-slot`*              -> exit group B
 *   `.work__services` + `.work__scroll`              -> exit group C
 * None of those elements is written by any other system, so the two scroll
 * systems can never fight over the same transform.
 *
 * TESTIMONIAL CONTENT
 * The project ships NO verified client testimonials and no client imagery, so
 * this section renders a single, clearly-marked placeholder record rather than
 * invented quotes, names, companies or photographs. The structure is
 * data-driven: replacing PLACEHOLDER_TESTIMONIALS with real, attributed
 * records is all that is needed — the counter, the arrows and the per-record
 * swap all read from it.
 */

export type Testimonial = {
  id: string
  /** The client's own words. Never a paraphrased or invented outcome. */
  quote: string
  /** Verified client name, or a neutral placeholder label. */
  author: string
  /** Role / project context. */
  role: string
  /** Optional VERIFIED client image. Left undefined while none is supplied. */
  avatar?: string
  avatarAlt?: string
  /** Descriptive, non-promotional category tags, where applicable. */
  tags?: string[]
  /** True while this record is a stand-in awaiting verified content. */
  isPlaceholder?: boolean
}

/**
 * TODO(testimonials): replace this placeholder with verified, attributed client
 * testimonials before publication. Each record needs a real quote, the client's
 * name, their role/project context, and — only if the client has approved a
 * photograph for publication — an `avatar` path plus meaningful `avatarAlt`.
 * Do not invent names, quotes, companies, outcomes or portraits to fill the
 * carousel; the counter and arrows already respond to whatever real data this
 * array holds.
 */
export const PLACEHOLDER_TESTIMONIALS: Testimonial[] = [
  {
    id: 'placeholder',
    quote:
      'Feedback from a real collaboration will be published here once it has been shared and approved by the client.',
    author: 'Awaiting verified testimonial',
    role: 'Name, role and project context to be confirmed',
    isPlaceholder: true,
  },
]

/** Zero-pad a 1-based slide number to the two-digit house style. */
function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** The circular control glyphs — the house inline-SVG convention, no icon font. */
function ControlArrow({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg
      className="work02__panel-arrow-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={direction === 'prev' ? 'M13.75 5.5 7.25 12l6.5 6.5' : 'M10.25 5.5 16.75 12l-6.5 6.5'}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

export function WorkTestimonials() {
  const sectionRef = useRef<HTMLElement>(null)
  const headRef = useRef<HTMLElement>(null)
  const portraitRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  const [index, setIndex] = useState(0)
  // Direction of the last slide change, so a swap can shift in from the side
  // the visitor is travelling towards. Purely presentational.
  const [direction, setDirection] = useState<1 | -1>(1)

  const total = PLACEHOLDER_TESTIMONIALS.length
  const current = PLACEHOLDER_TESTIMONIALS[index]
  // Until more than one verified record exists there is nothing to navigate to,
  // so the arrows stay visibly present but genuinely disabled — never a control
  // that moves the counter while the testimonial stands still.
  const canNavigate = total > 1

  const go = (step: 1 | -1) => {
    if (!canNavigate) return
    setDirection(step)
    setIndex((i) => (i + step + total) % total)
  }

  // ONE shared boundary timeline for the Work 01 exit and the Work 02 entrance.
  //
  // Scrubbed and non-pinning: the section stays in normal document flow and the
  // timeline's progress is driven purely by scroll position, so the whole
  // handoff reverses naturally and lands correctly wherever the page is
  // refreshed.
  //
  // Created only once the cinematic `.pin-spacer` exists: the pin-spacer is
  // inserted asynchronously when the 183 frames finish preloading, and until
  // then the document is in its transient, much shorter pre-pin layout, so
  // measuring the boundary early would compute an interval wrong by several
  // viewports. A MutationObserver fires the moment the settled document exists
  // — the same contract Work.tsx and ExpertiseExitRunway already use, with no
  // timer and no polling.
  useLayoutEffect(() => {
    const section = sectionRef.current
    const head = headRef.current
    const portrait = portraitRef.current
    const panel = panelRef.current
    if (!section || !head || !portrait || !panel) return

    // Reduced motion: no translation and no reveal. Both sections simply rest
    // in place, fully visible, and the reading order is untouched.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Work 01 elements are owned by Work 01's 5-beat timeline; do not animate them here.
    const work01 = document.getElementById('work')
    if (!work01) return

    // These are declared for clarity; Work 01 exit is not handled here.
    const _groupA: HTMLElement[] = []
    const _groupB: HTMLElement[] = []
    const _groupC: HTMLElement[] = []

    let context: ReturnType<typeof gsap.context> | null = null
    let observer: MutationObserver | null = null

    const create = () => {
      if (context) return
      if (!document.querySelector('.pin-spacer')) return

      context = gsap.context(() => {
        const boundary = gsap.timeline({
          defaults: { ease: 'none' },
          // `scrub` links the timeline's progress to the scroll position over
          // `[top bottom, top 12%]` — "top bottom" is the instant this section's
          // first pixel reaches the fold, i.e. the instant Work 01 exactly fills
          // the viewport and its own resting state has been reached. Interval
          // length is therefore 0.88 viewports.
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'top 12%',
            scrub: true,
            invalidateOnRefresh: true,
          },
        })

        // Normalise the timeline's total duration to exactly 1 so its
        // `progress()` IS the shared boundary progress p, which makes every
        // interval below literally a fraction of the scroll window. Without it
        // the earliest tween end (0.94) would become the timeline length and
        // every interval would silently scale by 1/0.94.
        boundary.to({}, { duration: 1 }, 0)

        // Work 01 exit is fully owned by Work.tsx's 5-beat timeline; do not animate Work 01 elements here.

        // ---- WORK 02 ENTRANCE ---------------------------------------------
        // Positions are the groups' intended final spots; the whole section
        // also travels through normal document flow, so this is a short
        // relative reveal on top of that, never a second movement system.

        // Upper row — 0.30 -> 0.65, entering from +32px.
        boundary.fromTo(
          head,
          { y: 32, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.35 },
          0.3,
        )

        // Portrait stack — 0.40 -> 0.88, entering from +56px.
        boundary.fromTo(
          portrait,
          { y: 56, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.48 },
          0.4,
        )

        // Testimonial panel — 0.45 -> 0.94, entering from +44px.
        boundary.fromTo(
          panel,
          { y: 44, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.49 },
          0.45,
        )

        // Measure NOW. This trigger is deliberately created only once the
        // cinematic's `.pin-spacer` exists, which happens asynchronously when
        // the 183 frames are ready — i.e. AFTER the page's own initial
        // measurement pass has already run, and nothing schedules another one
        // until the next resize. A ScrollTrigger that is never measured keeps
        // `start: 0 / end: undefined` and holds its timeline at progress 0
        // forever, so the handoff would silently never play. Refreshing this one
        // instance (not `ScrollTrigger.refresh()`) corrects it without
        // re-measuring or touching any other trigger on the page.
        boundary.scrollTrigger?.refresh()
      }, section)

      observer?.disconnect()
      observer = null
    }

    observer = new MutationObserver(create)
    observer.observe(document.body, { childList: true, subtree: true })
    create()

    return () => {
      observer?.disconnect()
      observer = null
      // Reverts every inline state this timeline wrote — including the Work 01
      // children — and kills the timeline with its trigger, so a teardown can
      // never strand either section mid-transition.
      context?.revert()
      context = null
    }
  }, [])

  return (
    <section
      id="work-testimonials"
      className="work02"
      ref={sectionRef}
      aria-labelledby="work02-title"
    >
      {/* UPPER ROW — section label, headline, supporting copy and the slide
          counter. In normal flow at the top of the section; the two visual
          columns below are the absolutely positioned layers. */}
      <div className="work02__inner">
        <header className="work02__head" ref={headRef}>
          <div className="work02__intro">
            <p className="work02__eyebrow">
              <span className="work02__eyebrow-num">02</span>
              <span className="work02__eyebrow-line" aria-hidden="true" />
              <span className="work02__eyebrow-text">Client Perspective</span>
            </p>

            <h2 className="work02__title" id="work02-title">
              <span className="work02__title-line">Trusted by</span>
              <span className="work02__title-line work02__title-accent">
                Businesses.
              </span>
            </h2>
          </div>

          {/* Supporting copy, separated from the headline by a thin vertical
              divider. Deliberately compact so the headline stays dominant. */}
          <div className="work02__support">
            <p className="work02__support-lead">
              Real collaborations. Meaningful results.
            </p>
            <p className="work02__support-note">
              Here&rsquo;s what clients and partners say about working together.
            </p>
          </div>

          {/* LOCAL decorative rule + counter. This small rule belongs to this
              section's own composition; the removed viewport-wide decorative
              line is not reintroduced. */}
          <div className="work02__counter">
            <span className="work02__counter-rule" aria-hidden="true" />
            <span className="work02__counter-value" aria-live="polite">
              {pad(index + 1)} / {pad(total)}
            </span>
          </div>
        </header>
      </div>

      {/*
        PORTRAIT-CARD STACK — PLACEHOLDER STATE.

        The supplied portrait-card composite does NOT exist in this project
        (`assets/` holds only floating-1/2/3.png and background-work-1.jpg), and
        inventing a portrait to fill the gap would be misrepresentation. This
        block therefore reserves the exact geometry the real artwork needs
        (left 8%, top 32%, width 45%, bottom 85% of the section) and stands in
        with three plainly abstract panels carrying the described depth
        relationship — warm amber rear-left, cool blue rear-right, and a large
        ivory-bordered centre card.

        TODO(assets): drop the supplied transparent portrait-stack composite in
        as `assets/portrait-stack.png`, replace this block with a single
        <img class="work02__portrait-img"> (object-fit: contain) and delete the
        `--work02-*` placeholder colours below. Nothing else needs to change:
        the box's size and position already match the intended composition.
      */}
      <div className="work02__portrait" ref={portraitRef} aria-hidden="true">
        <span className="work02__portrait-card work02__portrait-card--rear-left" />
        <span className="work02__portrait-card work02__portrait-card--rear-right" />
        <span className="work02__portrait-card work02__portrait-card--front">
          <span className="work02__portrait-note">
            Portrait artwork required
          </span>
        </span>
      </div>

      {/* TESTIMONIAL GLASS PANEL — one rounded, translucent card on the right.
          Never overlaps the portrait stack (it starts at 57% while the stack
          ends at 53%). */}
      <article className="work02__panel" ref={panelRef}>
        <p className="work02__panel-eyebrow">
          <span className="work02__panel-dot" aria-hidden="true" />
          <span className="work02__panel-eyebrow-text">Client Testimonial</span>
        </p>

        <span className="work02__panel-quote" aria-hidden="true">
          &ldquo;
        </span>

        {/* `data-dir` drives the restrained shift/fade of the swap below it. */}
        <div
          className="work02__panel-flow"
          data-dir={direction === 1 ? 'next' : 'prev'}
        >
          {/* Keyed on the record id so a slide change remounts the CONTENT and
              replays the restrained shift/fade — no autoplay, no timers. The
              arrow controls are deliberately NOT inside this subtree: were they
              remounted on every change, activating one would destroy the very
              button the visitor is using and silently drop keyboard focus. */}
          <div className="work02__panel-swap" key={current.id}>
            <blockquote className="work02__panel-text">
              <p>{current.quote}</p>
            </blockquote>

            <span className="work02__panel-rule" aria-hidden="true" />

              <footer className="work02__panel-foot">
                <div className="work02__panel-author">
                  {current.avatar ? (
                    <img
                      className="work02__panel-avatar"
                      src={current.avatar}
                      alt={current.avatarAlt ?? ''}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    /* No verified client photograph exists, so the avatar is an
                       empty frame rather than an invented identity. */
                    <span
                      className="work02__panel-avatar work02__panel-avatar--empty"
                      aria-hidden="true"
                    />
                  )}

                  <span className="work02__panel-meta">
                    <span className="work02__panel-name">{current.author}</span>
                    <span className="work02__panel-role">{current.role}</span>
                    {current.tags && current.tags.length > 0 ? (
                      <span className="work02__panel-tags">
                        {current.tags.map((tag) => (
                          <span className="work02__panel-tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </div>
              </footer>
            </div>

            {/* Circular controls — STABLE nodes, deliberately outside the keyed
                swap above. Disabled — not fake — until more than one verified
                record exists in the data. */}
            <div className="work02__panel-controls">
              <button
                type="button"
                className="work02__panel-arrow"
                onClick={() => go(-1)}
                disabled={!canNavigate}
                aria-label="Previous testimonial"
              >
                <ControlArrow direction="prev" />
              </button>
              <button
                type="button"
                className="work02__panel-arrow"
                onClick={() => go(1)}
                disabled={!canNavigate}
                aria-label="Next testimonial"
              >
                <ControlArrow direction="next" />
              </button>
            </div>
          </div>
        </article>
    </section>
  )
}
