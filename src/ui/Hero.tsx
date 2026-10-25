import { useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { HeroSheen } from './HeroSheen'
import { subscribeScrollProgress } from '../progressBus'
import {
  ABOUT_START,
  RED_W1,
  RED_W2,
  RED_W3,
  RED_W4,
  YELLOW_START,
  YELLOW_END,
} from '../aboutBeats'

/**
 * HERO — Step 3
 *
 * Cinematic hero section built on top of existing UIOverlay.
 * Implements specified editorial layout while preserving canvas.
 */

/**
 * The portfolio sections these CTAs point at are built in later steps.
 * Links whose destination does not exist yet stay inert: preventing the
 * default keeps a click from writing a fragment to the URL or nudging the
 * scroll position, which matters while ScrollTrigger owns the pin. The
 * Navbar applies the same rule to its links; the guard is duplicated here
 * because Hero must not depend on Navbar internals. Same rule for both CTAs:
 * the primary points at #work and the ghost at #contact.
 */
function holdTarget(event: ReactMouseEvent<HTMLAnchorElement>) {
  const href = event.currentTarget.getAttribute('href')
  const targetId = href?.startsWith('#') ? href.slice(1) : ''
  if (targetId && !document.getElementById(targetId)) {
    event.preventDefault()
  }
}

export function Hero() {
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const paragraphRef = useRef<HTMLParagraphElement>(null)
  const ctasRef = useRef<HTMLDivElement>(null) // .hero__ctas — the hero CTA group
  const trustRef = useRef<HTMLDivElement>(null)
  // YELLOW group refs — CHANGE B extension (refined into a cascade):
  const descriptorRef = useRef<HTMLDivElement>(null) // .hero__descriptor (CODE/DESIGN/SOLVE/BUILD/GROW)
  const signatureRef = useRef<HTMLImageElement>(null) // .hero__signature
  const metricsRef = useRef<HTMLDivElement>(null) // .hero__metrics (bottom-right panel)

  // CHANGE B — RED group: three sequential left exits driven by the existing
  // cinematic scroll progress (broadcast through the shared progress bus; the
  // ScrollTrigger in CinematicCanvas stays the single source of truth).
  //
  //   1. headline + supporting paragraph  (one coordinated unit)
  //   2. the hero CTA group — "View My Work ↗" + "Let's Talk ↗" exit together
  //      as one unit (a single wrapper transform keeps their gap and relative
  //      positions intact; neither button is staggered)
  //   3. trust row (avatars + both lines)
  //
  // Each unit translates LEFT by its own measured right edge + a safety
  // margin, so it always fully clears the viewport regardless of browser
  // size. Mapping is a pure function of progress (contiguous windows, an
  // accelerating exit curve), so reversing the scroll restores the exact
  // original positions in reverse order. Only transform/visibility/
  // pointer-events are ever written — never layout — and writes are cached:
  // a tick where every unit is static costs nothing. No React state is
  // touched on the animation path.
  useEffect(() => {
    // Reduced motion: keep the hero text and buttons exactly in place. The
    // cinematic scrub is unchanged (that is the project's existing
    // reduced-motion model), so only the navbar's scroll-state CTA hide still
    // applies.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const headline = headlineRef.current
    const paragraph = paragraphRef.current
    const ctas = ctasRef.current // .hero__ctas — both hero buttons as one group
    const trust = trustRef.current
    if (!headline || !paragraph || !ctas || !trust) return

    // Exit distances are measured, never assumed: each unit is fully outside
    // the left edge once translated by its measured right edge + SAFETY.
    const SAFETY = 8
    let unit1 = 0 // headline/paragraph — the widest of the two right edges
    let unit2 = 0 // the CTA group (its right edge = both buttons' rightmost)
    let unit3 = 0 // trust row

    const measure = () => {
      const h = headline.getBoundingClientRect()
      const p = paragraph.getBoundingClientRect()
      unit1 = Math.max(h.right, p.right) + SAFETY
      // The CTA group's own box stretches to the width of its column (its
      // text buttons are far narrower), so it cannot be used for travel.
      // Measure the two buttons' real content extent instead: translating the
      // wrapper by the buttons' rightmost edge + SAFETY clears both exactly.
      let buttonsRight = 0
      ctas.querySelectorAll('a.hero__cta').forEach((b) => {
        buttonsRight = Math.max(buttonsRight, b.getBoundingClientRect().right)
      })
      unit2 = buttonsRight + SAFETY
      unit3 = trust.getBoundingClientRect().right + SAFETY
    }
    measure()

    // Re-measure only when the layout genuinely changes: viewport resizes,
    // font swaps and late asset loads can all move a right edge. Never during
    // a scroll tick.
    const remeasure = () => measure()
    window.addEventListener('resize', remeasure)
    window.addEventListener('load', remeasure)
    document.fonts?.ready.then(remeasure).catch(() => {})

    // Contiguous progress windows over the cinematic's 0..1 progress: each
    // unit's exit begins exactly when the previous one finishes. The RED
    // phase boundaries are REALLOCATED (not redesigned) so the whole Home
    // exit sits inside the calibrated turn window: RED runs from RED_W1 ..
    // RED_W4 in src/aboutBeats.ts. That budget is still divided 48 / 25 / 27
    // across the units, so the heavier headline/paragraph owns the largest
    // share and the trust row takes the remainder. Order, grouping, easing
    // and reverse-scroll behaviour are unchanged.
    const W1 = RED_W1 // RED start — headline + paragraph begins
    const W2 = RED_W2 // = W1 + RED * 0.48 — headline + paragraph complete
    const W3 = RED_W3 // = W2 + RED * 0.25 — both hero CTAs as one group
    const W4 = RED_W4 // = W3 + RED * 0.27 — trust row; RED completes here

    // Accelerating exit curve, e(u) = λ·u + (1−λ)·u². Each unit begins
    // responding immediately (linear portion) and gains momentum toward a
    // decisive finish (quadratic growth). λ is the response weight: smaller λ
    // means a quieter start with a stronger late push; larger λ means a more
    // even, controlled slide. One consistent motion language across the RED
    // group, with each unit holding the weight that matches its visual mass.
    const L1 = 0.15 // headline — weighty, gathers momentum
    const L2 = 0.12 // CTA — compact, most decisive
    const L3 = 0.25 // trust row — even, stable
    const ease = (t: number, lambda: number) =>
      lambda * t + (1 - lambda) * t * t

    const local = (p: number, from: number, to: number) =>
      Math.max(0, Math.min(1, (p - from) / (to - from)))

    const px = (v: number) => Math.round(v * 100) / 100

    // Cached writes: only touch the DOM when a unit's value actually changed.
    let last1: string | null = null
    let last2: string | null = null
    let last3: string | null = null
    let ctaGone = false

    const apply = (progress: number) => {
      const t1 = ease(local(progress, W1, W2), L1)
      const t2 = ease(local(progress, W2, W3), L2)
      const t3 = ease(local(progress, W3, W4), L3)

      // Unit 1 — headline + paragraph share one transform so they stay locked
      // together as a single coordinated unit.
      const s1 = t1 <= 0 ? '' : `translateX(${px(-unit1 * t1)}px)`
      if (s1 !== last1) {
        last1 = s1
        headline.style.transform = s1
        paragraph.style.transform = s1
      }

      // Unit 2 — both hero CTAs share one wrapper transform, so their gap,
      // dimensions and relative positions are preserved throughout. Once the
      // group is fully off-screen neither button may stay keyboard-focusable
      // or intercept pointer input; the instant it starts returning (t2 < 1)
      // both regain interactivity together.
      const s2 = t2 <= 0 ? '' : `translateX(${px(-unit2 * t2)}px)`
      if (s2 !== last2) {
        last2 = s2
        ctas.style.transform = s2
      }
      const gone = t2 >= 1
      if (gone !== ctaGone) {
        ctaGone = gone
        ctas.style.visibility = gone ? 'hidden' : ''
        ctas.style.pointerEvents = gone ? 'none' : ''
      }

      // Unit 3 — the trust row keeps its approved translateY(-50px) lift; the
      // exit transform composes on top of it and reverts to the CSS value at
      // rest.
      const s3 = t3 <= 0 ? '' : `translateX(${px(-unit3 * t3)}px) translateY(-50px)`
      if (s3 !== last3) {
        last3 = s3
        trust.style.transform = s3
      }
    }

    const unsubscribe = subscribeScrollProgress(apply)
    return () => {
      unsubscribe()
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('load', remeasure)
      // Leave no inline state behind on unmount.
      headline.style.transform = ''
      paragraph.style.transform = ''
      ctas.style.transform = ''
      ctas.style.visibility = ''
      ctas.style.pointerEvents = ''
      trust.style.transform = ''
    }
  }, [])

  // CHANGE B (ext.) — YELLOW cascade: the vertical skill stack, the signature
  // and the metrics panel exit LEFT in one coordinated, staggered phase that
  // begins exactly where the RED sequence completes (p = YELLOW_START, taken
  // from the shared map so the RED/YELLOW handoff can never drift) and ends
  // at YELLOW_END, the completion of the whole Home exit. The hero "Let's
  // Talk ↗" button is NOT a YELLOW target: per the corrected grouping it
  // exits with "View My Work ↗" as RED unit 2.
  //
  // Unlike the strictly sequential RED phase, the three YELLOW targets run
  // short overlapping windows within the YELLOW budget [YELLOW_START,
  // YELLOW_END] (from src/aboutBeats.ts) so the group cascades instead of
  // vanishing as a flat block (windows normalized within the phase):
  //     skill stack    [0.17, 0.48]
  //     signature      [0.39, 0.72]
  //     metrics panel  [0.62, 1.00]
  // Each target also carries its own movement weight: the skill stack
  // controlled with clear momentum, the signature soft and even (its
  // handwritten character), the metrics panel stable and substantial.
  //
  // The right-side targets slide across the centre of the film where the
  // subject sits (the subject is composed dead-centre, verified by sampled
  // canvas pixels at the viewport middle), so each one dissolves through a
  // short smoothstep fade that reaches zero opacity just before its right
  // edge enters the protected band: the text never becomes visible over the
  // face or body. Everything is a pure function of progress, so reversing
  // the scroll restores the exact composition.
  useEffect(() => {
    // Reduced motion: same rule as the RED phase — keep everything in place.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const descriptor = descriptorRef.current // CODE/DESIGN/SOLVE/BUILD/GROW
    const signature = signatureRef.current
    const metrics = metricsRef.current
    if (!descriptor || !signature || !metrics) return

    const SAFETY = 8
    const Y_START = YELLOW_START // = RED_END: the exact end of the RED sequence
    const Y_END = YELLOW_END // = HOME_END: the whole Home exit completes here
    const YW = Y_END - Y_START
    // Staggered cascade windows, normalized within the YELLOW phase.
    const STK_A = Y_START + 0.17 * YW
    const STK_B = Y_START + 0.48 * YW
    const SIG_A = Y_START + 0.39 * YW
    const SIG_B = Y_START + 0.72 * YW
    const MET_A = Y_START + 0.62 * YW
    const MET_B = Y_START + 1.0 * YW
    // Movement weight per target (see ease below).
    const LAMBDA_STACK = 0.2 // controlled, smooth momentum
    const LAMBDA_SIG = 0.3 // soft, even, elegant
    const LAMBDA_METRICS = 0.35 // stable, substantial
    // Protected band: a centred column that reliably contains the subject's
    // face/torso. Half-width 0.22 × viewport => the band spans the middle 44%
    // of the screen, leaving the two UI columns well outside it.
    const BAND_HALF = 0.22
    // The short dissolve occupies the last 35% of each target's approach to
    // the band and completes at its boundary: fully opaque while clear of the
    // subject, zero just as it would begin entering the protected region.
    const FADE_SHARE = 0.35

    let unitStack = 0 // skill stack travel (measured right edge + SAFETY)
    let initStack = 0 // its un-translated right edge
    let unitSig = 0
    let initSig = 0
    let unitMetrics = 0
    let initMetrics = 0
    let bandRight = 0

    const measure = () => {
      initStack = descriptor.getBoundingClientRect().right
      unitStack = initStack + SAFETY
      initSig = signature.getBoundingClientRect().right
      unitSig = initSig + SAFETY
      initMetrics = metrics.getBoundingClientRect().right
      unitMetrics = initMetrics + SAFETY
      bandRight = window.innerWidth * (0.5 + BAND_HALF)
    }
    measure()
    const remeasure = () => measure()
    window.addEventListener('resize', remeasure)
    window.addEventListener('load', remeasure)
    document.fonts?.ready.then(remeasure).catch(() => {})

    // Accelerating exit curve, e(u) = λ·u + (1−λ)·u² — immediate restrained
    // response, increasing momentum, decisive completion. Same family as the
    // RED phase, tuned per target to its movement weight.
    const ease = (t: number, lambda: number) =>
      lambda * t + (1 - lambda) * t * t
    const local = (p: number, from: number, to: number) =>
      Math.max(0, Math.min(1, (p - from) / (to - from)))
    const px = (v: number) => Math.round(v * 100) / 100
    // Short, controlled dissolve edge: 1 while the element is clear of the
    // protected band, smoothstepping to exactly 0 as its right edge reaches
    // the boundary. '' (CSS default) while fully opaque, so at rest CSS
    // styling (e.g. the signature's 0.85) is untouched.
    const smoothstep = (v: number) => {
      const t = Math.max(0, Math.min(1, v))
      return t * t * (3 - 2 * t)
    }
    const dissolve = (currentRight: number, initEdge: number) => {
      const span = Math.max(1, (initEdge - bandRight) * FADE_SHARE)
      const k = (currentRight - bandRight) / span
      return k >= 1 ? '' : String(px(smoothstep(k)))
    }

    let lastStackT: string | null = null
    let lastStackO: string | null = null
    let lastSigT: string | null = null
    let lastSigO: string | null = null
    let lastMetricsT: string | null = null
    let lastMetricsO: string | null = null

    const apply = (progress: number) => {
      // Skill stack — controlled cascade, first of the right-side targets.
      const ts = ease(local(progress, STK_A, STK_B), LAMBDA_STACK)
      const stackT = ts <= 0 ? '' : `translateX(${px(-unitStack * ts)}px)`
      if (stackT !== lastStackT) {
        lastStackT = stackT
        descriptor.style.transform = stackT
      }
      const stackO = ts <= 0 ? '' : dissolve(initStack - unitStack * ts, initStack)
      if (stackO !== lastStackO) {
        lastStackO = stackO
        descriptor.style.opacity = stackO
      }

      // Signature — softer, even exit, starting before the stack finishes.
      const tg = ease(local(progress, SIG_A, SIG_B), LAMBDA_SIG)
      const sigT = tg <= 0 ? '' : `translateX(${px(-unitSig * tg)}px)`
      if (sigT !== lastSigT) {
        lastSigT = sigT
        signature.style.transform = sigT
      }
      const sigO = tg <= 0 ? '' : dissolve(initSig - unitSig * tg, initSig)
      if (sigO !== lastSigO) {
        lastSigO = sigO
        signature.style.opacity = sigO
      }

      // Metrics panel — substantial, stable, last of the three.
      const tm = ease(local(progress, MET_A, MET_B), LAMBDA_METRICS)
      const metricsT = tm <= 0 ? '' : `translateX(${px(-unitMetrics * tm)}px)`
      if (metricsT !== lastMetricsT) {
        lastMetricsT = metricsT
        metrics.style.transform = metricsT
      }
      const metricsO = tm <= 0 ? '' : dissolve(initMetrics - unitMetrics * tm, initMetrics)
      if (metricsO !== lastMetricsO) {
        lastMetricsO = metricsO
        metrics.style.opacity = metricsO
      }
    }

    const unsubscribe = subscribeScrollProgress(apply)
    return () => {
      unsubscribe()
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('load', remeasure)
      // Leave no inline state behind on unmount.
      descriptor.style.transform = ''
      descriptor.style.opacity = ''
      signature.style.transform = ''
      signature.style.opacity = ''
      metrics.style.transform = ''
      metrics.style.opacity = ''
    }
  }, [])

  // REDUCED MOTION — Home/About handoff.
  //
  // The RED and YELLOW phases are transform exits and are skipped entirely
  // when the user prefers reduced motion (see the guards above), which would
  // otherwise leave the whole Home composition on screen while the About
  // blocks reveal over it. So in that mode the Home content is hidden as a
  // single scroll-tied step — never a time-based tween — at exactly the
  // progress where the Home exit would have completed (ABOUT_START), and
  // restored when the user scrolls back above it. No transform is written,
  // so the reduced-motion model (scrub without motion) is unchanged.
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const candidates: (HTMLElement | null)[] = [
      headlineRef.current,
      paragraphRef.current,
      ctasRef.current,
      trustRef.current,
      descriptorRef.current,
      signatureRef.current,
      metricsRef.current,
    ]
    const targets = candidates.filter((el): el is HTMLElement => el !== null)
    if (targets.length === 0) return

    let hidden: boolean | null = null
    const apply = (progress: number) => {
      const next = progress >= ABOUT_START
      if (next === hidden) return
      hidden = next
      for (const el of targets) {
        el.style.opacity = next ? '0' : ''
        el.style.visibility = next ? 'hidden' : ''
        el.style.pointerEvents = next ? 'none' : ''
      }
    }

    return subscribeScrollProgress(apply)
  }, [])

  return (
    <>
      <HeroSheen />
      <section className="hero" aria-label="Hero">
      <div className="hero__inner ui-inset">
        {/* Left editorial content */}
        <div className="hero__left">
          <div className="hero__eyebrow">
            <span className="hero__eyebrow-label"><span className="hero__eyebrow-dot" aria-hidden="true" />WEBSITE DEVELOPER</span>
            <span className="hero__eyebrow-sep" aria-hidden="true" />
            <span className="hero__eyebrow-loc">BANGALORE, INDIA</span>
          </div>

          <h1 className="hero__headline" ref={headlineRef}>
            {/* The explicit spaces between the line spans exist for the mobile
                headline (styles/responsive/hero-mobile.css) where the spans flow as
                one paragraph and Playfair wraps the copy across four lines.
                On the desktop the spans are flex items and a whitespace-only
                anonymous flex item is not rendered, so the desktop's five
                rows are unchanged. */}
            <span>I Design &amp; Develop</span>{' '}
            <span>High-Quality Digital</span>{' '}
            <span>Experiences</span>{' '}
            <span>That Help</span>{' '}
            <span className="hero__highlight">Businesses Grow.</span>
          </h1>

          <p className="hero__paragraph t-body" ref={paragraphRef}>
            I build modern, high-performance websites that not only look exceptional
            but also help businesses attract customers, build trust and grow.
          </p>

          <div className="hero__ctas" ref={ctasRef}>
            <a
              className="hero__cta hero__cta--primary ui-layer--interactive"
              href="#work"
              data-sheen="true"
              onClick={holdTarget}
            >
              <span>View My Work</span>
              <svg
                className="hero__cta-arrow"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M3.25 8.75 8.75 3.25M4.5 3.25h4.25V7.5"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="square"
                />
              </svg>
            </a>
            <a
              className="hero__cta hero__cta--ghost ui-layer--interactive"
              href="#contact"
              onClick={holdTarget}
            >
              <span>Let's Talk</span>
              <svg
                className="hero__cta-arrow"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M3.25 8.75 8.75 3.25M4.5 3.25h4.25V7.5"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="square"
                />
              </svg>
            </a>
          </div>

        </div>

        {/* Bottom-left cluster — the trust group sits directly above the SCROLL
            indicator. Anchoring the pair to the bottom of the hero stage is what
            keeps the row's distance to the indicator fixed; while the group
            lived inside the vertically-centred left column it drifted up and
            away from the indicator as the viewport grew taller. */}
        <div className="hero__lower">
          <div className="hero__trust" ref={trustRef}>
            <div className="hero__avatars">
              <span className="hero__avatar"><img src="/avatars/avatar-01.jpg" alt="" aria-hidden="true" /></span>
              <span className="hero__avatar"><img src="/avatars/avatar-02.jpg" alt="" aria-hidden="true" /></span>
              <span className="hero__avatar"><img src="/avatars/avatar-03.jpg" alt="" aria-hidden="true" /></span>
              <span className="hero__avatar"><img src="/avatars/avatar-04.jpg" alt="" aria-hidden="true" /></span>
            </div>
            <div className="hero__trust-text">
              <div className="hero__trust-title">Trusted by businesses</div>
              <div className="hero__trust-sub">Startups · Local Businesses · Creators</div>
            </div>
          </div>

          <div className="hero__scroll">
            <span className="hero__scroll-line" aria-hidden="true" />
            <span className="hero__scroll-dot" aria-hidden="true" />
            <span className="hero__scroll-label">SCROLL</span>
          </div>
        </div>

        {/* Right editorial identity */}
        <div className="hero__right">
          <div className="hero__descriptor" ref={descriptorRef}>
            <span>CODE</span>
            <span>DESIGN</span>
            <span>SOLVE</span>
            <span>BUILD</span>
            <span>GROW</span>
            <span className="hero__descriptor-dash" aria-hidden="true" />
          </div>
          <img
            className="hero__signature"
            ref={signatureRef}
            src="/brand/signature.svg"
            alt=""
            aria-hidden="true"
          />
        </div>

        {/* Bottom metrics panel */}
        <div className="hero__metrics" ref={metricsRef}>
          <div className="hero__metric">
            <div className="hero__metric-value">5+</div>
            <div className="hero__metric-label">
              <span>PROJECTS</span>
              <span>DELIVERED</span>
            </div>
          </div>
          <span className="hero__metric-sep" aria-hidden="true" />
          <div className="hero__metric">
            <div className="hero__metric-value">100%</div>
            <div className="hero__metric-label">
              <span>FOCUSED ON</span>
              <span>CLIENT SUCCESS</span>
            </div>
          </div>
          <span className="hero__metric-sep" aria-hidden="true" />
          <div className="hero__metric">
            <div className="hero__metric-value">∞</div>
            <div className="hero__metric-label">
              <span>COMMITMENT TO</span>
              <span>BETTER SOLUTIONS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  )
}