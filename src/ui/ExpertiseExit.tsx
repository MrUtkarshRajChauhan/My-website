import { useEffect, useRef, type ReactNode } from 'react'
import {
  EXIT_SEQUENCE_END,
  subscribeExpertiseExitProgress,
} from '../expertiseExitBus'

/**
 * EXPERTISE EXIT — the five-stage, scroll-scrubbed exit for the Expertise scene.
 *
 * This component owns NO scene markup. It renders one absolutely-positioned
 * wrapper around everything that makes up the Expertise scene — the About
 * chrome (whose section marker reads EXPERTISE through this phase) and the
 * `<Expertise />` section — so the exit has a single, stable query scope. The
 * navbar is NOT inside this wrapper (it is a sibling inside the UI layer), so it
 * never moves, and neither does the canvas/subject.
 *
 * WHAT CHANGED
 * The exit is NO LONGER part of the cinematic 0..1 progress and no longer runs
 * inside the film's pin. It now runs in a DEDICATED post-cinematic runway (see
 * `ExpertiseExitRunway`): the film's pin ends at 6 viewport heights, the canvas
 * holds frame 183, and this component scrubs the exit across the next four
 * viewport heights from its own bus, `subscribeExpertiseExitProgress`, whose
 * local progress `p_e` is 0 exactly at the pin release and 1 exactly when Work
 * reaches the fold; the exit itself completes in the first 90% of that range.
 * This component still adds no ScrollTrigger, no pin, no timer and no rAF loop —
 * it is a pure function of the sensible-looking scalar it is handed, and it
 * scrubs both ways.
 *
 *     p_e ∈ [0, 1]                          the runway's own progress
 *     s   = clamp01(p_e / EXIT_SEQUENCE_END) the accelerated sequence progress
 *     r   = clamp01((s - from) / (to - from))     a beat's local window
 *     y   = -d * (1 - (1 - r)^3)            d = that beat's measured distance
 *
 * FIVE SEQUENTIAL STAGES. Each stage must finish before the next begins; the
 * stages tile the sequence edge to edge, and inside a stage each beat gets its
 * own disjoint sub-window. The sequence is compressed into the first 90% of
 * `p_e` (≈11% faster), so the whole exit is fully out at `p_e = 0.90` — exactly
 * where the closing statement's reveal begins. Scrolling back up walks the whole
 * cascade in reverse and restores every element to its exact pre-exit position
 * (nothing is ever `display:none`d), so the sequence is fully reversible.
 *
 * The boundaries below are in SEQUENCE units (0..1); multiply by
 * `EXIT_SEQUENCE_END` for the equivalent `p_e`:
 *
 *   1. 0.00 – 0.18  bottom workflow strip (Real-World Use Cases)
 *   2. 0.18 – 0.40  lower technology row, left → right
 *                   (Deployment, Design, BaaS, Optimization)
 *   3. 0.40 – 0.62  middle technology groups (Backend, Database & ORM) and the
 *                   central code core with its connector network
 *   4. 0.62 – 0.80  upper technology row (Frontend Foundations, Frameworks),
 *                   the right-side progress rail and the scene heading
 *   5. 0.80 – 1.00  the entire left-side composition and — on phones — the
 *                   mobile six-panel viewport (its own beat: the hidden
 *                   desktop tree must never contribute its full viewport
 *                   height to the left beat's measured distance), then the
 *                   remaining Expertise chrome (the About marker that reads
 *                   EXPERTISE)
 */

/**
 * One element inside a beat, plus the transform the element ALREADY owns in CSS
 * that the exit must preserve (the rail is centred with `translateY(-50%)`, so
 * its exit has to be composed after that, not replace it).
 */
type Member = { sel: string; base?: string }

/**
 * One beat. `from`/`to` are OPTIONAL absolute windows in `p_e`; when omitted the
 * stage divides its own span equally between its beats. They are given only
 * where a beat has to straddle a checkpoint boundary (stage 5).
 */
type Beat = { members: Member[]; from?: number; to?: number }
type Stage = { start: number; end: number; beats: Beat[] }

/**
 * THE CHOREOGRAPHY TABLE — bottom layers leave first, top layers last, and the
 * left explanatory unit leaves as one moving unit (its slides
 * `.expertise__slide` already own their own entrance transforms and cannot be
 * split without breaking the lane geometry). The About chrome is moved AS A
 * WHOLE rather than by its marker, because <AboutChrome /> writes the marker's
 * transform every frame; translating the chrome wrapper instead means no
 * competing transform is ever written to the same node. Every other member is a
 * positioned element whose transform is not owned by any other system, so the
 * exit composes with, and never overwrites, the existing per-element motion.
 */
const STAGES: Stage[] = [
  // 1 — bottom workflow strip.
  {
    start: 0.0,
    end: 0.18,
    beats: [{ members: [{ sel: '.expertise__workflow' }] }],
  },
  // 2 — lower technology row, left → right.
  {
    start: 0.18,
    end: 0.4,
    beats: [
      { members: [{ sel: '.expertise__cat[data-cluster="deployment"]' }] },
      { members: [{ sel: '.expertise__cat[data-cluster="design"]' }] },
      { members: [{ sel: '.expertise__cat[data-cluster="baas"]' }] },
      { members: [{ sel: '.expertise__cat[data-cluster="seo"]' }] },
    ],
  },
  // 3 — middle technology groups + central core and its connectors.
  {
    start: 0.4,
    end: 0.62,
    beats: [
      { members: [{ sel: '.expertise__cat[data-cluster="backend"]' }] },
      { members: [{ sel: '.expertise__cat[data-cluster="database"]' }] },
      { members: [{ sel: '.expertise__core' }, { sel: '.expertise__wires' }] },
    ],
  },
  // 4 — upper technology row + right progress rail + scene heading.
  {
    start: 0.62,
    end: 0.8,
    beats: [
      { members: [{ sel: '.expertise__cat[data-cluster="frontend"]' }] },
      { members: [{ sel: '.expertise__cat[data-cluster="frameworks"]' }] },
      { members: [{ sel: '.expertise__xrail', base: 'translateY(-50%)' }] },
      { members: [{ sel: '.expertise__heading' }] },
    ],
  },
  // 5 — the whole left composition, then the remaining scene chrome. The left
  // unit is given an explicit window that still carries it past p_e = 0.90, so
  // the final checkpoint reads "left-side content exiting" rather than "gone".
  {
    start: 0.8,
    end: 1.0,
    beats: [
      { members: [{ sel: '.expertise__left' }], from: 0.8, to: 0.94 },
      // PHONE PANELS (<= 767px): the six mobile compositions live in the
      // `.expertise-mobile` viewport, so on a phone THAT is the content that
      // must clear the top. Same window as the left unit — the same role in
      // the composition — but its own beat: on desktop the mobile tree is
      // display:none, yet the scene wraps everything in `visibility: hidden`
      // while inactive, and visibility-hidden elements still measure, so a
      // shared beat would inflate the desktop left unit's exit distance by
      // the mobile viewport's height. A separate beat keeps desktop's
      // distances byte-identical (the mobile beat degenerates to an 8px
      // transform on an unpainted element) while the phone band gets the
      // real content clearance.
      { members: [{ sel: '.expertise-mobile' }], from: 0.8, to: 0.94 },
      { members: [{ sel: '.about-chrome' }], from: 0.94, to: 1.0 },
    ],
  },
]

/** Extra travel so a beat's lowest edge clears the viewport top with room to
 *  spare, rather than resting exactly on y = 0. */
const EXIT_SAFETY = 8

export function ExpertiseExit({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    type Resolved = { el: HTMLElement; base: string; last: string | null }
    type WindowedBeat = {
      members: Resolved[]
      dist: number
      from: number
      to: number
    }

    // Resolve every member element once, and cache its last-written transform
    // so the scroll path only touches the DOM when a value actually changes.
    // Beats are flattened out of their stages with their windows pre-resolved,
    // so the scroll path stays a single flat loop.
    const beats: WindowedBeat[] = STAGES.flatMap((stage) => {
      const span = stage.end - stage.start
      return stage.beats.map((beat, i) => ({
        from: beat.from ?? stage.start + (span * i) / stage.beats.length,
        to: beat.to ?? stage.start + (span * (i + 1)) / stage.beats.length,
        dist: 0,
        members: beat.members.flatMap((m) =>
          Array.from(wrapper.querySelectorAll<HTMLElement>(m.sel)).map((el) => ({
            el,
            base: m.base ?? '',
            last: null,
          })),
        ),
      }))
    })

    // Measured only on real layout change, never on a scroll frame. The members
    // live in the fixed UI layer, so their rects are already viewport-relative
    // and independent of the current scroll position. A beat's distance is the
    // largest of its members' own "clear the top edge" distances, so whichever
    // member starts lowest is guaranteed to leave the viewport.
    const measure = () => {
      for (const beat of beats) {
        let d = 0
        for (const m of beat.members) {
          d = Math.max(d, m.el.getBoundingClientRect().bottom + EXIT_SAFETY)
        }
        beat.dist = Math.max(0, d)
      }
    }

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
    const easeOut = (r: number) => 1 - Math.pow(1 - clamp01(r), 3)

    const write = (m: Resolved, value: string) => {
      if (value === m.last) return
      m.last = value
      m.el.style.transform = value
    }

    let lastPe = 0

    const apply = (pe: number) => {
      lastPe = pe

      if (reduced) {
        // Reduced motion: no large travel — disclose the scene away instead.
        wrapper.style.visibility = pe > 0 ? 'hidden' : ''
        return
      }

      // Compress the whole choreography into the FIRST `EXIT_SEQUENCE_END` of
      // `p_e`, so the exit runs ~11% faster and completes exactly where the
      // closing statement's reveal begins (see `ExpertiseExitRunway`). The
      // stage table above is unchanged — only its input is rescaled, and only
      // once, so the sequence is never compressed twice.
      const seq = clamp01(pe / EXIT_SEQUENCE_END)

      for (const beat of beats) {
        // Disjoint windows, so the beats (and the stages) are strictly sequential.
        const r = clamp01((seq - beat.from) / (beat.to - beat.from))
        if (r <= 0) {
          for (const m of beat.members) write(m, '')
          continue
        }
        const move = `translate3d(0, ${(-beat.dist * easeOut(r)).toFixed(2)}px, 0)`
        for (const m of beat.members) {
          write(m, m.base ? `${m.base} ${move}` : move)
        }
      }
    }

    const remeasure = () => {
      measure()
      apply(lastPe)
    }

    measure()
    window.addEventListener('resize', remeasure)
    document.fonts?.ready.then(remeasure).catch(() => {})

    // subscribeExpertiseExitProgress replays the last value immediately, so
    // every beat is placed correctly on mount and when scrolling back up.
    const unsubscribe = subscribeExpertiseExitProgress(apply)

    return () => {
      unsubscribe()
      window.removeEventListener('resize', remeasure)
      for (const beat of beats) {
        for (const m of beat.members) m.el.style.transform = ''
      }
      wrapper.style.visibility = ''
    }
  }, [])

  return (
    <div className="expertise-exit" ref={wrapperRef}>
      {children}
    </div>
  )
}
