import { Fragment, useEffect, useLayoutEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * The scroll progress at which Work 01's ENTRY composition has fully arrived:
 * the timeline's own `'left-entered'` label below (added at duration 0.2 of the
 * 1.0 total duration, so the label ratio equals trigger progress). At the bare
 * section root (progress 0) the pre-state still holds — title, paragraph and
 * CTAs are not in view yet — which is why the navbar clicks Work to this
 * milestone instead of the section's top edge. The timeline defines the label
 * and this constant is derived from it in one place, so the two cannot drift.
 */
export const WORK01_ENTRY_PROGRESS = 0.2

/**
 * WORK — the post-film page section (Step 1: background + hero).
 *
 * This is the first piece of the portfolio that lives in NORMAL DOCUMENT FLOW.
 * Everything above it (Hero, the five About blocks, the About chrome, Expertise)
 * is fixed inside the UI layer and rides over the pinned cinematic canvas. Work
 * is a plain sibling that sits AFTER the canvas' pin-spacer, so it is simply
 * revealed as the pinned film scrolls away — no pin, no ScrollTrigger, no wheel
 * handling, no route, no nested scroller.
 *
 * WHY IT IS A SIBLING OF <CinematicCanvas /> IN App
 * ScrollTrigger wraps the canvas in its pin-spacer at the canvas' position. A
 * normal-flow element placed after the canvas therefore lands after that spacer,
 * at the document offset where the pin releases. Ordering it BEFORE <UIOverlay>
 * (and giving it --z-content) keeps the fixed navbar above it: the UI layer is
 * the same z-index and comes later in document order.
 *
 * BACKGROUND
 * This section deliberately paints NO background of its own. The one persistent
 * fixed layer (`.static-background`, mounted and crossfaded in by
 * <ExpertiseExitRunway />) already sits behind it, so the same stationary image
 * serves both the transition and this page. Keeping it a single layer is what
 * guarantees the background cannot drift, re-apply, or crossfade against a
 * duplicate copy while Work scrolls over it. No overlay is painted between that
 * asset and the Work content, so it shows through exactly as authored: no
 * gradient, vignette, duotone or recolour is applied.
 *
 * ENTRANCE — THE FIVE-BEAT MILESTONE CHOREOGRAPHY
 * One additional, non-pinning GSAP/ScrollTrigger timeline (the only trigger
 * this component adds) drives Work 01 as five beats on five equal scroll
 * intervals: left content + CTAs, service strip, the three mockups, the left
 * exit, then the mockup/strip exit into Work 02. The timeline is scrubbed by
 * the scroll position and snapped to exact milestone positions, so one
 * deliberate wheel gesture produces one visual change, settles, and holds —
 * no autoplay, no timers. A capture-phase wheel normalizer on this runway
 * absorbs the surplus deltas of a gesture burst so it cannot sweep through
 * several beats (see "WHEEL NORMALIZER" in the effect), and the snap clamps
 * every settle to one milestone beyond the last settled one. Everything is
 * fully scrubbed, so scrolling forward or backward restores each preceding
 * milestone in order; reduced motion skips the choreography entirely.
 *
 * SCOPE
 * Step 1 only: the background, the left hero (label + divider, the three-line
 * headline, the paragraph) and the two CTAs. The project mockups, feature row,
 * project cards, testimonials and contact content are later steps.
 */

/**
 * Same guard the Hero and Navbar use: a link whose destination does not exist
 * yet stays inert, so a click cannot write a fragment to the URL or nudge the
 * scroll position. Both Work destinations are built in later steps, so both are
 * intentionally inert for now — no placeholder section is invented here.
 */
function holdTarget(event: ReactMouseEvent<HTMLAnchorElement>) {
  const href = event.currentTarget.getAttribute('href')
  const targetId = href?.startsWith('#') ? href.slice(1) : ''
  if (targetId && !document.getElementById(targetId)) {
    event.preventDefault()
  }
}

/** The one arrow used by both CTAs — the existing Hero/Navbar inline SVG mark. */
function CtaArrow() {
  return (
    <svg
      className="work__cta-arrow"
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
  )
}

import floating1 from '../../assets/floating-1.png'
import floating2 from '../../assets/floating-2.png'
import floating3 from '../../assets/floating-3.png'

/**
 * The three project previews, bottom layer first.
 *
 * MODIFIER -> ASSET -> ROLE
 *   cream   floating-2  warm cream Nexora site,   REAR-LEFT  (z 1)
 *   navy    floating-3  deep navy Orvion site,    REAR-RIGHT (z 2)
 *   front   floating-1  dark emerald studio site, FOREGROUND (z 3)
 *
 * This order is also the paint order, and only position, size and z-index live
 * in work.css: the PNGs already carry their own tilt, outline, highlights and
 * transparent padding, so nothing is layered onto the artwork itself.
 */
const CARDS = [
  { modifier: 'cream', src: floating2 },
  { modifier: 'navy', src: floating3 },
  { modifier: 'front', src: floating1 },
] as const

/** The bottom-right service strip, in order. */
const SERVICES = [
  { kind: 'monitor', label: 'Web Design' },
  { kind: 'layers', label: 'Development' },
  { kind: 'chart', label: 'Digital Experience' },
] as const

/**
 * Gate for the pointer-reactive hover: only a real fine pointer, and only when
 * the visitor has not asked for reduced motion. gsap.matchMedia() re-evaluates
 * this live, so toggling the OS preference tears the interaction down (and
 * restores the resting composition) instead of leaving a card stuck lifted.
 */
const HOVER_QUERY =
  '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

/** Clamp a 0..1 ratio, then map it onto [-1, 1]. */
function signedUnit(ratio: number) {
  const t = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio
  return t * 2 - 1
}

/**
 * The three service glyphs. The project ships no icon library (its only
 * dependencies are gsap, lenis and react), so these follow the same hand-rolled
 * inline-SVG convention as CtaArrow below and the navbar arrow: a stroked path
 * on currentColor, never a font glyph and never an added package.
 */
function ServiceIcon({ kind }: { kind: (typeof SERVICES)[number]['kind'] }) {
  return (
    <svg
      className="work__service-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'monitor' ? (
        <>
          <rect x="2.5" y="4" width="19" height="13" rx="2" />
          <path d="M12 17v3.5M8.5 20.5h7" />
        </>
      ) : null}
      {kind === 'layers' ? (
        <>
          <path d="M12 3.25 3 8l9 4.75L21 8l-9-4.75Z" />
          <path d="m3 12.4 9 4.75 9-4.75" />
          <path d="m3 16.8 9 4.75 9-4.75" />
        </>
      ) : null}
      {kind === 'chart' ? (
        <>
          <path d="M4 4v15.5h16" />
          <path d="M8.5 16.5v-4.5M13 16.5V8M17.5 16.5v-7.5" />
        </>
      ) : null}
    </svg>
  )
}

export function Work() {
  const sectionRef = useRef<HTMLElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const showcaseRef = useRef<HTMLDivElement>(null)
  const runwayRef = useRef<HTMLDivElement>(null)

  // Five-beat Work 01 choreography: one non-pinning timeline on an independent runway.
  // Created only once the cinematic's `.pin-spacer` exists for correct measurement.
  useLayoutEffect(() => {
    const section = sectionRef.current
    const copy = copyRef.current
    const showcase = showcaseRef.current
    const runway = runwayRef.current
    if (!section || !copy || !showcase || !runway) return

    // Reduced motion: drop the movement, keep reading order.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let context: ReturnType<typeof gsap.context> | null = null
    let observer: MutationObserver | null = null
    let resizeCleanup: (() => void) | null = null
    let wheelCleanup: (() => void) | null = null

    const create = () => {
      if (context) return
      if (!document.querySelector('.pin-spacer')) return

      context = gsap.context(() => {
        const work = section
        const titleEl = work.querySelector<HTMLElement>('.work__title')
        const paraEl = work.querySelector<HTMLElement>('.work__para')
        const ctaRow = work.querySelector<HTMLElement>('.work__ctas')
        const services = work.querySelector<HTMLElement>('.work__services')
        const rail = work.querySelector<HTMLElement>('.work__rail')
        const scrollCue = work.querySelector<HTMLElement>('.work__scroll')
        const cards = Array.from(
          work.querySelectorAll<HTMLElement>('.work__card-slot'),
        )

        // The WORK label and its divider are deliberately NOT in the timeline:
        // they are anchored chrome (like the rail and the scroll cue) with no
        // GSAP ownership of transform or opacity, so they stay fixed at the
        // approved top-left position through the entrance, hold and exit beats
        // — visible from Work 01's activation, never slipping or fading
        // mid-runway, and leaving only when the sticky stage itself releases
        // into Work 02 (which reverses with the same stage movement).
        const leftGroup = [
          ...(titleEl ? [titleEl] : []),
          ...(paraEl ? [paraEl] : []),
          ...(ctaRow ? [ctaRow] : []),
        ]

        // GESTURE CALIBRATION — one deliberate gesture equals one milestone.
        // A deliberate wheel gesture is roughly 2-3 wheel notches (or one
        // short trackpad flick), physically around 240-400px of scroll; the
        // milestone band below is calibrated to the same distance so the raw
        // landing of a single gesture sits inside one band and the directional
        // snap docks it to exactly ONE adjacent milestone. The normalizer and
        // snap keep larger bursts to one milestone as well; this distance
        // simply keeps the common case free of settle pull-backs.
        // NOTE: computeScrollDist and stepDist must stay mathematically
        // identical — the runway is H + 5d so the trigger spans exactly 5d
        // ahead of 'top top', one d per beat interval.
        const stepLen = () => {
          const H = window.innerHeight
          return Math.round(Math.max(240, Math.min(400, H * 0.3)))
        }

        const computeScrollDist = () => {
          const H = window.innerHeight
          return H + 5 * stepLen()
        }

        const updateRunway = () => {
          const dist = computeScrollDist()
          runway.style.height = `${dist}px`
          return dist - window.innerHeight
        }

        updateRunway()

        // The milestone index (0..5) whose exact scroll position the sequence
        // last settled on. Every snap settle is clamped to one milestone
        // beyond it (in either direction) and re-records itself on completion,
        // which is what turns a whole wheel burst into ONE state change.
        let lastStableStep = 0

        // THE MILESTONE CONTRACT — five beats on five equal scroll intervals,
        // measured ahead of the runway's top edge:
        //   start 0.00 / left-entered 0.20 / services-entered 0.40 /
        //   mockups-entered 0.60 / left-exited 0.80 / work01-exited 1.00
        // The timeline's total duration is exactly 1.0, so label ratios are
        // trigger progress, and every settle lands on an exact milestone
        // scroll position. The timeline is scrubbed by the scroll position —
        // no autoplay, no timers — so the page holds at the settled milestone
        // indefinitely until the next deliberate gesture.
        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: runway,
            start: 'top top',
            end: () => `+=${stepLen() * 5}`,
            scrub: 0.15,
            snap: {
              // GESTURE-NORMALIZED MILESTONE SNAP — the settle target is
              // computed here instead of trusting a finished length of
              // scrolling, so a gesture is ONE command. First the directional
              // lookup picks the next/previous milestone, exactly like the
              // built-in labelsDirectional; then the result is clamped to ONE
              // milestone beyond the last SETTLED one. Combined with the
              // runway's wheel normalizer (see below) a continuous burst of
              // wheel events can never play through or skip several beats —
              // the input stream is absorbed, the landing is docked to the
              // adjacent milestone in the travel direction, reverse restores
              // the preceding one, and every settled position is exact.
              inertia: false,
              snapTo: (progress: number, self: unknown) => {
                const step = 0.2
                const trigger = self as ScrollTrigger
                const raw = gsap.utils.clamp(0, 1, progress)
                // Directional neighbour: forward takes the first milestone at
                // or past the settled scroll, reverse the first at or below.
                // From a rest position the epsilon keeps the current
                // milestone pinned — only real movement re-docks.
                const index =
                  trigger.direction > 0
                    ? Math.ceil((raw - 1e-3) / step)
                    : trigger.direction < 0
                      ? Math.floor((raw + 1e-3) / step)
                      : Math.round(raw / step)
                // One milestone beyond the last settled one, at most — this
                // is what caps a burst (or a keyboard jump / scrollbar drag)
                // to a single state change wherever it physically lands.
                const floor = Math.max(0, lastStableStep - 1)
                const ceiling = Math.min(5, lastStableStep + 1)
                const target = gsap.utils.clamp(floor, ceiling, index) * step
                // Record the resting milestone for landings ScrollTrigger
                // settles WITHOUT a pull-back tween: when the raw landing is
                // already the target, or rests outside [start, end] (the
                // release zone below 'work01-exited'), the tween — and with
                // it the onSnapComplete hook — never runs, and a stale clamp
                // range here would freeze the sequence. Resting at or past a
                // milestone boundary means exactly that milestone is the one
                // the next gesture must advance from.
                if (Math.abs(raw - target) < 0.005 || progress >= 1 - 1e-9) {
                  lastStableStep = target / step
                }
                return target
              },
              delay: 0.08,
              duration: { min: 0.12, max: 0.24 },
              ease: 'power2.out',
            },
            // Selected here because ScrollTrigger reads onSnapComplete from
            // the Trigger vars themselves (not from within snap) and calls it
            // the moment the snap tween has finished scrolling. The settled
            // scroll is then exactly a milestone position, so rounding it
            // recovers the milestone index the next gesture advances from.
            onSnapComplete: (self) => {
              const settled = gsap.utils.clamp(
                0,
                1,
                (window.scrollY - self.start) / (self.end - self.start),
              )
              lastStableStep = Math.round(settled / 0.2)
            },
            invalidateOnRefresh: true,
          },
        })

        timeline.add('start', 0)
          .add('left-entered', 0.2)
          .add('services-entered', 0.4)
          .add('mockups-entered', 0.6)
          .add('left-exited', 0.8)
          .add('work01-exited', 1)

        // Initial pre-state
        gsap.set(leftGroup, { y: 100, autoAlpha: 0 })
        gsap.set(services, { y: 80, autoAlpha: 0 })
        gsap.set(cards, { y: 120, autoAlpha: 0 })
        gsap.set(rail, { autoAlpha: 1 })
        gsap.set(scrollCue, { autoAlpha: 1 })

        // Beat 1 (0 -> 0.2): headline and paragraph enter; the CTAs
        // follow immediately in a short stagger and land exactly on 0.2.
        timeline.to(
          leftGroup,
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.14,
            stagger: 0.02,
            ease: 'power2.out',
          },
          'start',
        )

        // Beat 2 (0.2 -> 0.4): the service strip rises on its own interval.
        timeline.to(
          services,
          { y: 0, autoAlpha: 1, duration: 0.2, ease: 'power2.out' },
          'left-entered',
        )

        // Beat 3 (0.4 -> 0.6): the mockups assemble in depth order — rear-left,
        // rear-right, then the foreground anchor, which completes exactly at
        // 0.6 where the full composition rests before any exit.
        timeline.to(
          cards,
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.16,
            stagger: 0.02,
            ease: 'power2.out',
          },
          'services-entered',
        )

        // Beat 4 (0.6 -> 0.8): the left group leaves upward, CTAs following;
        // the whole group is gone by 0.8 while the mockups and strip hold.
        timeline.to(
          leftGroup,
          {
            y: -120,
            autoAlpha: 0,
            duration: 0.14,
            stagger: 0.02,
            ease: 'power2.in',
          },
          'mockups-entered',
        )

        // Beat 5 (0.8 -> 1.0): the mockups exit first (rear-left, rear-right,
        // then foreground, done by 0.98) and the strip follows, finishing
        // exactly at 1.0, where the sticky stage releases into Work 02.
        timeline.to(
          cards,
          {
            y: -100,
            autoAlpha: 0,
            duration: 0.14,
            stagger: 0.02,
            ease: 'power2.in',
          },
          'left-exited',
        )
        timeline.to(
          services,
          { y: -80, autoAlpha: 0, duration: 0.14, ease: 'power2.in' },
          'left-exited+=0.06',
        )

        timeline.scrollTrigger?.refresh()

        const onResize = () => {
          updateRunway()
          ScrollTrigger.refresh()
        }
        window.addEventListener('resize', onResize)
        resizeCleanup = () => window.removeEventListener('resize', onResize)

        // ---- WHEEL NORMALIZER (one deliberate gesture = one command) ----
        // The scrubbed timeline maps the scroll position continuously onto
        // the beats, so a wheel burst's surplus deltas would sweep the raw
        // scroll through several milestone bands while the gesture is still
        // in flight. Inside THIS runway the stream is normalized at its
        // source: the first wheel event of a gesture passes and Lenis eases
        // to that landing; every event after it — until the input goes quiet,
        // until the absorption cap expires (so a long continuous trackpad
        // scroll still advances at reading pace), or until the direction
        // flips (the user reversing mid-gesture reopens a fresh gesture) — is
        // swallowed with stopImmediatePropagation. A decaying momentum tail
        // (deltas shrinking, gaps growing) counts as one gesture for a grace
        // period: small deltas keep the burst alive even across longer gaps,
        // while anything big after quiet opens a fresh one. Lenis never sees
        // the surplus (its own wheel listener is bubble-phase, so a
        // capture-phase swallow precedes it), the landing stays inside one
        // band, and the snap docks that single gesture to the adjacent
        // milestone in the travel direction.
        //
        // SCOPE — strictly local: outside the runway [start, end] the wheel is
        // passed untouched, so the cinematic, Expertise, Work 02 and Contact
        // scroll exactly as before. Touch, keyboard, scrollbar dragging and
        // any non-wheel input are never intercepted; reduced-motion mounts
        // never create the listener at all.
        const WHEEL_BURST_GAP = 180 // ms of quiet that separates two gestures
        const WHEEL_TAIL_GAP = 700 // small momentum-tail deltas keep the burst alive this long
        const WHEEL_BIG_DELTA = 60 // deltas this large mark a deliberate new gesture
        const WHEEL_ABSORB_MS = 1600 // longest one absorbed burst may run
        let gestureLast = 0 // time of the last in-range event, passed or swallowed
        let gestureStart = 0 // when the current burst began
        let gestureDir = 0 // travel direction of the burst's opening event
        let absorbed = 0 // raw px swallowed in the current burst

        const onWheelNormalize = (event: WheelEvent) => {
          const trigger = timeline.scrollTrigger
          if (!trigger) return
          const y = window.scrollY
          if (y < trigger.start - 1 || y > trigger.end + 1) {
            // Outside the runway (approach, the whole document below it)
            // the input is never touched, even mid-burst.
            gestureLast = 0
            gestureDir = 0
            return
          }
          const now = performance.now()
          const dy = Math.abs(event.deltaY) || 1
          if (gestureLast === 0) {
            // First in-range event after an idle state: it passes untouched
            // and opens the absorb window.
            gestureLast = now
            gestureStart = now
            gestureDir = Math.sign(event.deltaY || 1)
            absorbed = 0
            return
          }
          const gap = now - gestureLast
          const flip =
            gestureDir !== 0 && Math.sign(event.deltaY || 1) !== gestureDir
          // The burst survives only a quiet gap below the threshold — but a
          // small-valued, shrinking momentum tail belongs to the same gesture
          // across a longer grace period than a deliberate new flick does.
          const continues =
            !flip &&
            now - gestureStart <= WHEEL_ABSORB_MS &&
            absorbed <= stepLen() * 2.2 &&
            (gap <= WHEEL_BURST_GAP ||
              (dy < WHEEL_BIG_DELTA && gap <= WHEEL_TAIL_GAP))
          gestureLast = now
          if (!continues) {
            // Fresh gesture (or an expired absorption window): this event
            // passes untouched and opens the next absorb window.
            gestureStart = now
            gestureDir = Math.sign(event.deltaY || 1)
            absorbed = 0
            return
          }
          // Still the same burst: swallow it so the landing cannot drift
          // across several beats. No counters and no timers decide anything
          // here — scroll position (via the snap above) remains the truth.
          absorbed += dy
          if (event.cancelable) event.preventDefault()
          event.stopImmediatePropagation()
        }
        window.addEventListener('wheel', onWheelNormalize, {
          capture: true,
          passive: false,
        })
        wheelCleanup = () =>
          window.removeEventListener('wheel', onWheelNormalize, {
            capture: true,
          })
      }, runway)

      observer?.disconnect()
      observer = null
    }

    observer = new MutationObserver(create)
    observer.observe(document.body, { childList: true, subtree: true })
    create()

    return () => {
      observer?.disconnect()
      observer = null
      resizeCleanup?.()
      resizeCleanup = null
      wheelCleanup?.()
      wheelCleanup = null
      context?.revert()
      context = null
    }
  }, [])

  // POINTER-REACTIVE HOVER — one independent interaction per card.
  //
  // GSAP's quickTo() is reused instead of building a tween per mousemove: each
  // card gets five reusable setters (rotationX / rotationY / x / y / scale)
  // that retarget the SAME tween, so a fast pointer cannot spawn a queue of
  // competing animations.
  //
  // OWNERSHIP — strictly one writer per property, so nothing fights:
  //   .work__showcase    owns the scroll entrance (group y + opacity)
  //   .work__card-slot   owns position only (left / top / width / z-index)
  //   .work__card-hover  owns the hover transform (this effect)
  //   img                is never touched
  //
  // gsap.matchMedia() gates the whole thing on a fine pointer AND
  // prefers-reduced-motion: no-preference and reverts everything it created
  // (listeners, tweens, the raised stacking order) if either condition changes
  // or on unmount. Touch devices therefore keep the static composition and a
  // tap is never emulated as a hover.
  useEffect(() => {
    const showcase = showcaseRef.current
    if (!showcase) return

    const mm = gsap.matchMedia()

    mm.add(HOVER_QUERY, () => {
      const hovers = Array.from(
        showcase.querySelectorAll<HTMLElement>('.work__card-hover'),
      )
      const teardowns: Array<() => void> = []

      for (const hover of hovers) {
        // The slot is the card's box AT REST and carries no transform, so its
        // rect stays stable while the hover wrapper tilts and scales inside it.
        // Measuring the animated wrapper would feed the tilt back into the
        // pointer mapping and make the card chase itself.
        const slot = hover.parentElement
        if (!slot) continue

        const toRotationX = gsap.quickTo(hover, 'rotationX', {
          duration: 0.35,
          ease: 'power3.out',
        })
        const toRotationY = gsap.quickTo(hover, 'rotationY', {
          duration: 0.35,
          ease: 'power3.out',
        })
        const toX = gsap.quickTo(hover, 'x', {
          duration: 0.35,
          ease: 'power3.out',
        })
        const toY = gsap.quickTo(hover, 'y', {
          duration: 0.35,
          ease: 'power3.out',
        })
        const toScale = gsap.quickTo(hover, 'scale', {
          duration: 0.35,
          ease: 'power3.out',
        })

        let rect: DOMRect | null = null

        const onEnter = () => {
          rect = slot.getBoundingClientRect()
          // Temporary elevation, local to this card: it becomes the foremost
          // of the three for as long as the pointer is on it.
          slot.classList.add('is-hovered')
          toScale(1.015)
          toY(-7)
        }

        const onMove = (event: PointerEvent) => {
          if (!rect || rect.width === 0 || rect.height === 0) return
          const nx = signedUnit((event.clientX - rect.left) / rect.width)
          const ny = signedUnit((event.clientY - rect.top) / rect.height)
          toRotationX(-ny * 3.5)
          toRotationY(nx * 5)
          toX(nx * 4)
          toY(ny * 3 - 7)
          toScale(1.015)
        }

        const onLeave = () => {
          rect = null
          slot.classList.remove('is-hovered')
          toRotationX(0)
          toRotationY(0)
          toX(0)
          toY(0)
          toScale(1)
        }

        slot.addEventListener('pointerenter', onEnter)
        slot.addEventListener('pointermove', onMove)
        slot.addEventListener('pointerleave', onLeave)
        slot.addEventListener('pointercancel', onLeave)

        teardowns.push(() => {
          slot.removeEventListener('pointerenter', onEnter)
          slot.removeEventListener('pointermove', onMove)
          slot.removeEventListener('pointerleave', onLeave)
          slot.removeEventListener('pointercancel', onLeave)
          slot.classList.remove('is-hovered')
          gsap.killTweensOf(hover)
        })
      }

      return () => {
        for (const teardown of teardowns) teardown()
        teardowns.length = 0
      }
    })

    return () => mm.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="work"
      className="work"
      aria-labelledby="work-title"
    >
      <div className="work01__runway" ref={runwayRef}>
        <div className="work01__stage">
          {/* LEFT RAIL — the vertical WORK indicator. A direct child of the
              sticky stage (not of the copy grid) so its percentages are
              measured against the 100svh Work hero box. Mounted inside the
              stage rather than on the section: while the stage is pinned the
              rail is anchored to the viewport and can never drift up and out
              of view with the runway's scroll. Decorative: it repeats the
              WORK eyebrow that precedes the headline, so assistive tech
              skips it. The eyebrow and this rail are two different marks and
              both stay visible. */}
          <aside className="work__rail" aria-hidden="true">
            <span className="work__rail-line" />
            <span className="work__rail-dot" />
            <span className="work__rail-label">WORK</span>
          </aside>

          {/* LOWER-LEFT SCROLL CUE — the same visual language as the Home hero's
              SCROLL indicator (vertical line, endpoint dot, small uppercase label)
              so the two pages read as one system. */}
          <div className="work__scroll">
            <span className="work__scroll-line" aria-hidden="true" />
            <span className="work__scroll-dot" aria-hidden="true" />
            <span className="work__scroll-label">SCROLL</span>
          </div>

          <div className="work__inner">
            <div className="work__copy" ref={copyRef}>
              <p className="work__label">
                <span className="work__label-text">WORK</span>
                <span className="work__label-line" aria-hidden="true" />
              </p>

              <h2 className="work__title" id="work-title">
                <span className="work__title-line">Explore My</span>
                <span className="work__title-line">Work Below</span>
                <span className="work__title-line">
                  and <span className="work__accent">Let's Talk.</span>
                </span>
              </h2>

              <p className="work__para">
                Here are some of the projects I've designed and developed
                &mdash; each built with a focus on clean design, real business
                value, and measurable results.
              </p>

              <div className="work__ctas">
                <a
                  className="work__cta work__cta--primary"
                  href="#work-projects"
                  onClick={holdTarget}
                >
                  <span>Explore the Works</span>
                  <CtaArrow />
                </a>
                <a
                  className="work__cta work__cta--ghost"
                  href="#contact"
                  onClick={holdTarget}
                >
                  <span>Let's Talk</span>
                  <CtaArrow />
                </a>
              </div>
            </div>
          </div>

          {/* THE COLLAGE — three independently positioned, independently hoverable
              project previews filling the right side of the hero. */}
          <div className="work__showcase" ref={showcaseRef} aria-hidden="true">
            {CARDS.map((card) => (
              <div
                key={card.modifier}
                className={`work__card-slot work__card-slot--${card.modifier}`}
              >
                <div className="work__card-hover">
                  <img src={card.src} alt="" className="work__card-img" />
                </div>
              </div>
            ))}
          </div>

          {/* SERVICE STRIP — the unboxed three-item row along the bottom-right edge. */}
          <ul className="work__services">
            {SERVICES.map((service, index) => (
              <Fragment key={service.label}>
                {index > 0 ? (
                  <li className="work__service-sep" aria-hidden="true" />
                ) : null}
                <li className="work__service">
                  <ServiceIcon kind={service.kind} />
                  <span className="work__service-label">{service.label}</span>
                </li>
              </Fragment>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
