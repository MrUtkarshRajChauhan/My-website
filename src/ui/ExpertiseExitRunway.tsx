import { useEffect, useRef } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  EXIT_SEQUENCE_END,
  BACKGROUND_FADE_END,
  STATEMENT_REVEAL_START,
  STATEMENT_REVEAL_END,
  STATEMENT_EXIT_START,
  STATEMENT_EXIT_END,
  emitExpertiseExitProgress,
} from '../expertiseExitBus'
import workBackground from '../../assets/background-work-1.jpg'

/**
 * EXPERTISE EXIT RUNWAY — the dedicated post-cinematic scroll phase.
 *
 * WHY A SEPARATE PHASE
 * The cinematic's single ScrollTrigger owns the 183-frame mapping and releases
 * its pin at 6 viewport heights. The Expertise exit must run AFTER that release,
 * over the frozen final frame, and must not touch the frame mapping or the pin
 * geometry. So the exit gets its OWN scroll phase, carried by this component,
 * completely outside the cinematic trigger:
 *
 *   • `ExpertiseExitRunway` renders one block of 4.48 viewport heights into
 *     normal document flow, between the pinned film and Work. It mounts the
 *     persistent static Work background and paints the closing editorial
 *     headline — otherwise it just lengthens the document by the distance the
 *     exit needs, plus a short trailing hold so the finished headline is
 *     readable before Work enters.
 *   • a SECOND, non-pinning ScrollTrigger over [6 vh, 11 vh] does three jobs:
 *       – it holds the canvas fixed, so the film's final frame stays on screen
 *         for the whole exit (the cinematic trigger is past its end and has
 *         already released the canvas to normal flow);
 *       – it publishes the runway-local exit progress `p_e` on its own bus;
 *       – it crossfades the static background over that frozen final frame and
 *         then reveals the closing statement, both as pure functions of `p_e`.
 *
 * DOUBLE-PIN IS DELIBERATELY AVOIDED. Experimentally, a second `pin` of the
 * SAME canvas — even with `pinSpacing: false` — reverts the shared pin-spacer
 * and collapses the cinematic's 6 vh of spacing on the next refresh. Two
 * ScrollTriggers pinning one element share one spacer, so their spacing cannot
 * compose. A non-pinning trigger that simply re-asserts `position: fixed` from
 * its callbacks touches no spacer and leaves the cinematic measurement exactly
 * as it was.
 *
 * GEOMETRY (innerHeight = vh)
 *   cinematic end   = 6 vh        (the film's own pin release)
 *   runway block    = 4.48 vh     (normal-flow length: exit + hold + statement exit)
 *   Work top        = 11.48 vh    (7 vh spacer + 4.48 vh runway)
 *   exit sequence   = [6 vh, 9.28 vh]       -> p_e 0 -> 0.82
 *   bg crossfade    = [9.28 vh, 9.52 vh]    -> p_e 0.82 -> 0.88 (full opacity)
 *   statement reveal= [9.52 vh, 9.88 vh]    -> p_e 0.88 -> 0.97 (all three beats)
 *   reading hold    = [9.88 vh, 10.28 vh]   -> headline fully visible (0.40 vh)
 *   statement exit  = [10.28 vh, 10.48 vh]  -> r 1.07 -> 1.12
 *   Work first pixel= 10.48 vh              -> the instant the headline is gone
 *
 * The trigger still spans 5 vh ([6 vh, 11 vh]) and the exit bus still carries
 * p_e = clamp01(progress * 5/4); only the runway's normal-flow length grew, so
 * the trigger endpoints never move. The headline holds for a full 0.40 vh, then
 * its exit completes exactly where Work's first pixel reaches the fold - so the
 * statement can never be superimposed over the Work hero. No frame of the exit
 * is ever blank and no part of Work is visible while the headline is on screen.
 *
 * The trigger is created only once the cinematic's `.pin-spacer` exists, i.e.
 * once the film is really pinned and the document has settled, so the fixed hold
 * can never fight the pin's own geometry.
 *
 * PERSISTENT STATIC BACKGROUND - `background-work-1` (the same asset the Work
 * section used to paint itself) lives here as ONE fixed, viewport-sized layer at
 * --z-content: above the canvas (1) and the cinematic overlay (2), below Work
 * (3, later in document order) and the UI layer (3). It fades in over the frozen
 * final frame across the crossfade window and then stays exactly put — it is the
 * new visual environment, not an animated subject, so nothing about it moves
 * once the fade is complete. Reusing this single layer (instead of a duplicate
 * on the Work section) is what keeps the background genuinely stationary while
 * Work scrolls over it.
 *
 * CLOSING STATEMENT - "Enough talk. / Let's see the work." One fixed overlay driven by
 * the SAME value computed right here. The exit choreography owns the first
 * `EXIT_SEQUENCE_END` of `p_e`, the background crossfade occupies
 * [EXIT_SEQUENCE_END, BACKGROUND_FADE_END], the headline then reveals across
 * [STATEMENT_REVEAL_START, STATEMENT_REVEAL_END] as three separate scroll beats
 * (Enough / talk. / Let's see the work.), holds through the reading pause, and finally
 * exits across [STATEMENT_EXIT_START, STATEMENT_EXIT_END] - a window that lives
 * past `p_e`'s saturation at 1, so the overlay is scrubbed by the runway's
 * UNCLAMPED value. No extra ScrollTrigger, no extra bus, no timer.
 *
 * It is deliberately NOT rendered inside `.expertise-exit`, even though that is
 * the exit composition, because `.expertise-exit` sits inside `.hero-scope`, and
 * `.hero-scope--hidden` (which dismisses the whole fixed scene the instant Work
 * reaches the fold) applies `opacity: 0` — an ancestor opacity cannot be
 * overridden by a child, so the statement would be faded out at the exact
 * progress (p_e = 1) at which it must be fully visible. Fixing that would mean
 * rewriting the protected Work handoff.
 *
 * So the statement is a root-level fixed layer at --z-cinematic-transition: above
 * the canvas (1) and the cinematic overlay (2), below Work (3) and the UI layer
 * (3). Work is transparent and shares the single static background, so the
 * overlay does NOT rely on being covered: it owns its whole lifecycle and reaches
 * its fully-hidden state (opacity 0, visibility hidden) BEFORE Work's first pixel
 * reaches the fold. Stacking only decides the single adjacent frame; the handoff
 * is enforced by progress, not by paint order. The navbar (later in document
 * order) still paints above both.
 */
const CINEMATIC_END_VH = 6
const EXIT_VH = 4
const HANDOFF_VH = 1
const HOLD_VH = EXIT_VH + HANDOFF_VH

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Smoothstep — matches the cinematic's existing easing vocabulary. */
const smoothstep = (t: number) => t * t * (3 - 2 * t)

/**
 * THREAD_SHIMMER — the five thin curved threads that already exist in
 * `background-work-1`, traced from the source pixels.
 *
 * The asset is 1408 × 736 (re-verified); that is both the overlay's `viewBox`
 * below and the coordinate space of every `d` here, so the paths land on the
 * artwork at any viewport. `d` is a smoothed centre-line trace of each
 * existing thread (measured from the image, deviation ≈ 2 source pixels).
 *
 * These paths are GEOMETRY ONLY. In the JSX they are emitted inside <defs>
 * and are never stroked or filled: the artwork already draws these lines, so
 * the overlay must not draw them a second time. They exist to feed each
 * bead's native SMIL <animateMotion>, which carries a small luminous bead
 * along the curve while every painted line stays perfectly still.
 *
 * `group` is the key into THREAD_BEAD_TIMING below and the suffix of the
 * `thread-path-…` ids the motion references.
 */
const THREAD_SHIMMER = [
  {
    group: 'upper-left',
    d: 'M 484 0 C 469 5.3 418.7 22.7 393.8 32 C 368.8 41.3 356 46.7 334.5 56 C 313 65.3 288.5 76 264.8 88 C 241 100 214 114.7 191.8 128 C 169.5 141.3 149.8 154.7 131.3 168 C 112.7 181.3 96.9 193.3 80.3 208 C 63.6 222.7 44.5 242 31.3 256 C 18 270 6 286 1 292',
  },
  {
    group: 'upper-right',
    d: 'M 1331 0 C 1332.9 4 1339.2 16 1342.5 24 C 1345.8 32 1347.3 34.7 1350.8 48 C 1354.3 61.3 1361 85.3 1363.5 104 C 1366 122.7 1366.4 142.7 1365.8 160 C 1365.1 177.3 1363.4 192 1359.8 208 C 1356.1 224 1349.2 242.7 1343.8 256 C 1338.3 269.3 1335.7 274.7 1327 288 C 1318.3 301.3 1302.3 323 1291.8 336 C 1281.3 349 1268.6 361 1264 366',
  },
  {
    group: 'mid-right',
    d: 'M 1404 348 C 1383.7 352.7 1327.9 363.3 1282 376 C 1236.1 388.7 1164.9 412 1128.8 424 C 1092.6 436 1094.5 436 1065.3 448 C 1036 460 992.5 477.7 953.3 496 C 914 514.3 850.5 547.7 830 558',
  },
  {
    group: 'lower-right',
    d: 'M 1405 432 C 1400.1 433.3 1394.7 436 1375.8 440 C 1356.8 444 1320.7 449.3 1291.5 456 C 1262.3 462.7 1227.2 472 1200.5 480 C 1173.8 488 1155.3 494.7 1131.3 504 C 1107.3 513.3 1079.4 525.3 1056.5 536 C 1033.6 546.7 1013.5 557.3 994 568 C 974.5 578.7 956.9 589.3 939.8 600 C 922.6 610.7 911.8 617.3 891.3 632 C 870.7 646.7 837.4 670.8 816.5 688 C 795.6 705.2 774.4 727.2 766 735',
  },
  {
    group: 'lower-left',
    d: 'M 1 415 C 2.8 416.5 7.6 419.6 11.5 423.8 C 15.4 427.9 16.6 433.3 24.3 440 C 31.9 446.7 45.5 456 57.5 464 C 69.5 472 82.4 480 96.5 488 C 110.6 496 123.7 503 142.3 512 C 160.8 521 197 537 208 542',
  },
] as const

/**
 * BEAD TIMING — duration and negative phase offset per curve.
 *
 * Every duration and every offset differs, so the five beads never move in
 * sync. The identical `dur`/`begin` pair is repeated on each bead's
 * `<animate opacity>` (see the overlay JSX below), which is what locks the
 * fade to the bead's position on the path and keeps the restart invisible.
 */
const THREAD_BEAD_TIMING = {
  'upper-left': { dur: '24s', begin: '-6s' },
  'upper-right': { dur: '31s', begin: '-17s' },
  'mid-right': { dur: '28s', begin: '-10s' },
  'lower-right': { dur: '34s', begin: '-23s' },
  'lower-left': { dur: '26s', begin: '-13s' },
} as const

export function ExpertiseExitRunway() {
  const backgroundRef = useRef<HTMLDivElement>(null)
  const enoughRef = useRef<HTMLSpanElement>(null)
  const talkRef = useRef<HTMLSpanElement>(null)
  const seeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let trigger: ScrollTrigger | null = null
    let observer: MutationObserver | null = null
    let canvas = document.querySelector<HTMLCanvasElement>('canvas')

    const background = backgroundRef.current
    const beats = [enoughRef.current, talkRef.current, seeRef.current]
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    // Re-assert the frozen final frame. The cinematic trigger released the
    // canvas to normal flow at its end; holding it fixed here keeps frame 183
    // covering the viewport for the whole exit. Only `position`/`top`/`left`/
    // `transform` are written (the canvas' intrinsic box is owned by
    // CinematicCanvas), and the same values are re-asserted on every update and
    // refresh, so the pin's release transform can never win.
    const holdFinalFrame = () => {
      if (!canvas) return
      canvas.style.position = 'fixed'
      canvas.style.top = '0px'
      canvas.style.left = '0px'
      canvas.style.transform = 'none'
    }

    // The static background is a pure function of `p_e` over the crossfade
    // window that opens exactly where the exit sequence ends:
    //
    //     t       = clamp01((p_e - EXIT_SEQUENCE_END) /
    //                        (BACKGROUND_FADE_END - EXIT_SEQUENCE_END))
    //     opacity = t*t*(3 - 2*t)        (smoothstep, 0 -> 1)
    //
    // It climbs from fully transparent (the frozen final frame shows through)
    // to fully opaque at BACKGROUND_FADE_END, then never changes again: the
    // image is fixed and viewport-sized, so later scroll cannot move it. A
    // reversed runway value walks it straight back toward the original frame.
    const renderBackground = (r: number) => {
      if (!background) return
      const t = clamp01(
        (r - EXIT_SEQUENCE_END) / (BACKGROUND_FADE_END - EXIT_SEQUENCE_END),
      )
      background.style.opacity = smoothstep(t).toFixed(3)
    }

    // The closing statement reveals as THREE sequential scroll beats over its
    // own fixed window, split into equal thirds:
    //
    //     s      = STATEMENT_REVEAL_START                (Enough begins)
    //     e      = STATEMENT_REVEAL_END                  (Let's see the work. ends)
    //     beat i = [s + i*span/3, s + (i+1)*span/3]       span = e - s
    //
    // Each beat has its own progress, so "Enough" appears first, then "talk.",
    // then the complete "Let's see the work." - all driven by the runway value, never
    // a timer.
    // Opacity plus a small upward translation (no scale, no bounce, no
    // typewriter). It starts 12px below its resting position and eases into
    // place, then holds at full opacity through the trailing normal-flow hold.
    // Reversing the runway value walks every beat straight back to invisible.
    // Reduced motion keeps the reveal and drops only the travel.
    const beatVisible: Array<boolean | null> = [null, null, null]
    const span = STATEMENT_REVEAL_END - STATEMENT_REVEAL_START

    const renderStatement = (r: number) => {
      // The headline's own exit, driven by the SAME unclamped runway value.
      // `p_e` saturates at 1, so this window ([STATEMENT_EXIT_START,
      // STATEMENT_EXIT_END], both > 1) is the only place the headline can leave
      // the screen; it is a pure function of scroll, so it reverses cleanly.
      const exitT = clamp01(
        (r - STATEMENT_EXIT_START) / (STATEMENT_EXIT_END - STATEMENT_EXIT_START),
      )
      const exitFade = 1 - smoothstep(exitT)

      const count = beats.length
      for (let i = 0; i < count; i++) {
        const el = beats[i]
        if (!el) continue
        const start = STATEMENT_REVEAL_START + (span * i) / count
        const end = STATEMENT_REVEAL_START + (span * (i + 1)) / count
        const t = clamp01((r - start) / (end - start))

        const eased = smoothstep(t) * exitFade
        const visible = eased > 0

        if (visible !== beatVisible[i]) {
          beatVisible[i] = visible
          el.style.visibility = visible ? 'visible' : 'hidden'
        }

        el.style.opacity = eased.toFixed(3)
        const y = reducedMotion ? 0 : 12 * (1 - eased)
        el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`
      }
    }

    const create = () => {
      if (trigger) return
      canvas = canvas ?? document.querySelector<HTMLCanvasElement>('canvas')
      const pinSpacer = document.querySelector('.pin-spacer')
      if (!canvas || !pinSpacer) return

      const cinematicEnd = () => window.innerHeight * CINEMATIC_END_VH

      // The exit's local progress, rescaled from the 5 vh hold onto the 4 vh
      // the exit itself spans. Shared by onUpdate and onRefresh so a refresh
      // mid-exit re-publishes the correct value (onUpdate is not guaranteed to
      // fire after a refresh). The value is left UNCLAMPED here: `p_e` saturates
      // at 1 (10 vh) while the trigger keeps running to 11 vh, and the closing
      // statement's exit lives in that unsaturated tail. Only the exit bus gets
      // the clamped 0..1 value.
      const emit = (self: ScrollTrigger) => {
        const r = self.progress * (HOLD_VH / EXIT_VH)
        // One progress update drives the end of the exit sequence, the
        // background crossfade and the closing statement — no second trigger,
        // no delay between them.
        emitExpertiseExitProgress(clamp01(r))
        renderBackground(r)
        renderStatement(r)
      }

      trigger = ScrollTrigger.create({
        // Absolute px, derived from the viewport: independent of the cinematic
        // trigger's own `end`, so it also survives a resize (both are functions).
        start: cinematicEnd,
        end: () => cinematicEnd() + window.innerHeight * HOLD_VH,
        onUpdate: (self) => {
          holdFinalFrame()
          emit(self)
        },
        onRefresh: (self) => {
          // Re-assert the hold whenever the runway has been reached or passed
          // (progress > 0), not only while actively scrubbing: a refresh past
          // the trigger's end lets the cinematic trigger re-apply its release
          // transform, and without this the frozen frame could be released for
          // a frame behind the static background. Below the runway start the
          // cinematic still owns the pin, so the hold must not be applied.
          if (self.progress > 0) holdFinalFrame()
          emit(self)
        },
        onToggle: (self) => {
          if (self.isActive) holdFinalFrame()
        },
        // Deterministic end states: scrolling back above the pin end restores
        // the fully-entered scene; scrolling past the hold keeps it exited.
        onLeaveBack: () => {
          emitExpertiseExitProgress(0)
          renderBackground(0)
          renderStatement(0)
        },
        onLeave: () => {
          holdFinalFrame()
          emitExpertiseExitProgress(1)
          renderBackground(1)
          // Past the trigger's end the headline must stay fully hidden, so end
          // the statement at its exit END (r = 1 is still mid-exit and would
          // re-reveal it).
          renderStatement(STATEMENT_EXIT_END)
        },
      })

      observer?.disconnect()
    }

    // The pin-spacer is inserted asynchronously (CinematicCanvas only creates
    // its ScrollTrigger after all 183 frames preload). A MutationObserver fires
    // as soon as the settled document exists, with no timer and no polling.
    observer = new MutationObserver(create)
    observer.observe(document.body, { childList: true, subtree: true })
    create()

    return () => {
      observer?.disconnect()
      observer = null
      trigger?.kill()
      trigger = null
      if (canvas) {
        canvas.style.position = ''
        canvas.style.top = ''
        canvas.style.left = ''
        canvas.style.transform = ''
      }
      if (background) {
        background.style.opacity = ''
      }
      beats.forEach((el) => {
        if (!el) return
        el.style.opacity = ''
        el.style.transform = ''
        el.style.visibility = ''
      })
      emitExpertiseExitProgress(0)
    }
  }, [])

  return (
    <div className="expertise-exit-runway">
      <div
        className="static-background"
        ref={backgroundRef}
        aria-hidden="true"
        style={{ backgroundImage: `url("${workBackground}")` }}
      >
        {/*
          NEON BEADS — five small luminous beads travelling the curves the
          artwork already paints (see THREAD_SHIMMER and THREAD_BEAD_TIMING
          above, and the `.work-background__thread-overlay` block in
          styles/layout.css).

          `<defs>` holds the shared radial halo gradient plus one motion-only
          path per curve; those paths are never stroked, so the overlay adds no
          line of its own — only the beads move. `viewBox` + `xMidYMid slice`
          mirror the layer's own `cover` / `center center`, so the beads crop
          with the image at every viewport. `aria-hidden` + `focusable="false"`
          and the stylesheet's `pointer-events: none` keep it out of the
          accessibility tree, the tab order and all pointer/wheel handling, so
          it can never sit between a reader and the content above it.
        */}
        <svg
          className="work-background__thread-overlay"
          viewBox="0 0 1408 736"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            {/* Soft outer halo: a bright mint-white centre falling through the
                inner neon and the mint accent to a restrained emerald rim, and
                finally to full transparency exactly at the circle's edge — so
                the glow reads as a small sphere of light rather than a ring,
                a starburst or a blur filter. */}
            <radialGradient id="thread-bead-halo">
              <stop offset="0%" stopColor="#E6FFF7" stopOpacity="0.95" />
              <stop offset="18%" stopColor="#65FFD1" stopOpacity="0.76" />
              <stop offset="45%" stopColor="#50E3A4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#00D6A0" stopOpacity="0" />
            </radialGradient>

            {/* Motion geometry only — inside <defs>, therefore never painted. */}
            {THREAD_SHIMMER.map((thread) => (
              <path
                key={thread.group}
                id={`thread-path-${thread.group}`}
                d={thread.d}
              />
            ))}
          </defs>

          {THREAD_SHIMMER.map((thread) => {
            const timing = THREAD_BEAD_TIMING[thread.group]
            return (
              // `opacity="0"` is only the resting fallback if SMIL is ever
              // unavailable; the <animate> below owns the real value.
              <g key={thread.group} className="thread-bead" opacity="0">
                {/* Layered like a glass bead: halo, mint body, bright core and
                    an offset specular highlight. */}
                <circle r="6" fill="url(#thread-bead-halo)" />
                <circle r="2.7" fill="#50E3A4" opacity="0.72" />
                <circle r="1.25" fill="#E6FFF7" opacity="0.95" />
                <circle
                  cx="-0.45"
                  cy="-0.45"
                  r="0.45"
                  fill="#FFFFFF"
                  opacity="0.78"
                />

                {/* Position — constant-pace travel along the existing curve.
                    The negative `begin` is the phase offset that keeps the five
                    beads out of step. */}
                <animateMotion
                  dur={timing.dur}
                  begin={timing.begin}
                  repeatCount="indefinite"
                  calcMode="paced"
                >
                  <mpath
                    href={`#thread-path-${thread.group}`}
                    xlinkHref={`#thread-path-${thread.group}`}
                  />
                </animateMotion>

                {/* Fade on the same clock: lit over the first 8 % of the path,
                    held to 86 %, then back to zero exactly at the endpoint so
                    the bead restarts while it is invisible — no flash, no jump,
                    no visible reset. */}
                <animate
                  attributeName="opacity"
                  dur={timing.dur}
                  begin={timing.begin}
                  repeatCount="indefinite"
                  values="0; 0.9; 0.9; 0"
                  keyTimes="0; 0.08; 0.86; 1"
                />
              </g>
            )
          })}
        </svg>
      </div>

      <div className="expertise-exit-transition">
        <div className="expertise-exit-transition__copy">
          <p className="expertise-exit-transition__text">
            <span className="expertise-exit-transition__line expertise-exit-transition__line--one">
              <span
                className="expertise-exit-transition__beat"
                ref={enoughRef}
              >
                Enough
              </span>{' '}
              <span className="expertise-exit-transition__beat" ref={talkRef}>
                talk.
              </span>
            </span>
            <span className="expertise-exit-transition__line expertise-exit-transition__line--two">
              <span className="expertise-exit-transition__beat" ref={seeRef}>
                Let's see the{' '}
                <em className="expertise-exit-transition__accent">work.</em>
              </span>
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
