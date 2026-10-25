import { useEffect } from 'react'
import { subscribeScrollProgress } from '../progressBus'
import { EXPERTISE_END, EXPERTISE_START } from '../aboutBeats'

/**
 * EXPERTISE PHONE PANEL TRACK (<= 767px) — the horizontal six-panel driver.
 *
 * On phones the Expertise scene presents as SIX sequential full-screen
 * compositions —
 *     0 Opening · 1 Frontend · 2 Frameworks · 3 Backend & Data ·
 *     4 Design & Deployment · 5 Closing
 * — that slide across ONE shared track: an outgoing composition leaves
 * left while the incoming one enters from the right, synchronized by
 * construction because they are fixed cells of the same strip. The
 * approved 768–900px stacked band and the desktop scene are untouched;
 * this component writes nothing outside the phone band.
 *
 * The `.expertise-mobile__track` element (rendered inside `Expertise.tsx`
 * next to the panels) IS the track: the phone stylesheet lays it out as a
 * grid of six viewport-wide columns whose box stays exactly one panel wide
 * (the columns overflow it), so moving one panel is one full track width.
 * The driver therefore translates by "-(panelPosition x 100)%" — the same
 * geometry the About phone track uses, and resize-free (percentages track
 * the viewport themselves).
 *
 * Position is a PURE function of the shared cinematic progress. The
 * authorized content interval is the Expertise ENTRANCE window the
 * existing code already owns — [EXPERTISE_START, EXPERTISE_END] (the
 * scene entry boundary to the fully-drawn hold; see aboutBeats.ts) —
 * normalised to q ∈ [0, 1], then split into six equal stages:
 *
 *     scaled  = q * 6
 *     index   = min(4, floor(scaled))
 *     local   = scaled - index                   (fraction of the stage)
 *     t       = smoothstep((local - 0.68) / 0.32)
 *     pos     = q in [5/6, 1] ? 5 : index + t
 *
 * 68% of every stage at rest, the following 32% sliding to the next
 * composition, the last stage resting from q = 5/6 — well before the
 * film ends and the separate post-cinematic exit runway (expertiseExitBus,
 * untouched) begins. Absolute boundaries (derived, EW = 0.11097120879):
 *
 *     Entry rest   [EXPERTISE_START .. EXPERTISE_START + 0.68 EW/6]
 *     slide 0 -> 1 [EXP ⇁ 0.821247 .. 0.827166]
 *     slide 1 -> 2 [        0.839742 .. 0.845661]
 *     slide 2 -> 3 [        0.858237 .. 0.864156]
 *     slide 3 -> 4 [        0.876733 .. 0.882651]
 *     slide 4 -> 5 [        0.895228 .. 0.901146]
 *     Closing rest [0.901146 .. 1]  (+ the whole post-film hold + exit)
 *
 * The easing is the project's smoothstep; every progress value maps to
 * exactly one translate, so reverse scrolling re-reverses any
 * half-completed slide continuously and no state can desync it. The
 * clip that keeps off-stage panels unpainted is the existing phone-band
 * rules — `.ui-layer { overflow-x: clip }` (about-track, mobile.css) plus
 * `.expertise { overflow: hidden }` in expertise-mobile.css.
 *
 * Like the About track driver this is a plain progressBus subscription:
 * no second ScrollTrigger, no timers, no rAF loops, no React state on
 * the animation path (writes are cached). Reduced motion keeps the
 * scrub (the panels move only with the user's own scrolling, the same
 * convention every other mobile composition follows); no independent
 * animation exists here. The exit runway moves `.expertise-mobile`
 * (the viewport wrapper) with `transform`, this driver writes the CSS
 * `translate` property on the TRACK itself — different elements, so the
 * two systems compose and never overwrite each other.
 */

// Mobile responsiveness has been removed from this build: the retired
// phone band can never match, so this driver only ever clears the track's
// translate while the hidden `.expertise-mobile` tree stays out of view.
const PANEL_QUERY = '(min-width: 9999px)'

export function ExpertiseMobileTrack() {
  useEffect(() => {
    const track = document.querySelector<HTMLElement>('.expertise-mobile__track')
    if (!track) return

    const mq = window.matchMedia(PANEL_QUERY)

    // The one interval the six compositions run on: the phase boundaries
    // the entrance choreography already uses (aboutBeats.ts).
    const EW = EXPERTISE_END - EXPERTISE_START

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
    // The project's smoothstep (same shape SceneDirector / the runway use):
    // soft ease into and out of each panel slide, identical in both
    // directions.
    const smoothstep = (t: number) => {
      const n = clamp01(t)
      return n * n * (3 - 2 * n)
    }
    // 4 decimals: on a 320px panel one unit is 3.2e-3 px — beyond sub-pixel.
    const pct = (v: number) => Math.round(v * 10000) / 10000

    const STAGE_COUNT = 6
    // 68% of each stage holds, 32% transitions to the next composition.
    const TRANSITION_SHARE = 0.32

    let lastP = -1
    let lastT = null as string | null

    const apply = (p: number) => {
      lastP = p

      // Desktop/tablet (>= 768px): the desktop scene owns this progress,
      // so the track must carry no inline translate at all.
      if (!mq.matches) {
        if (lastT !== '') {
          lastT = ''
          track.style.translate = ''
        }
        return
      }

      // Normalise the authorized content interval into q, then split it
      // into six equal stages with the 0.68 / 0.32 rest / slide share.
      const q = clamp01((p - EXPERTISE_START) / EW)
      const scaled = q * STAGE_COUNT
      const fromIndex = Math.min(4, Math.floor(scaled))
      const localProgress = q >= 1 ? 1 : scaled - fromIndex
      const transitionProgress = smoothstep(
        clamp01(
          (localProgress - (1 - TRANSITION_SHARE)) / TRANSITION_SHARE,
        ),
      )
      const panelPosition =
        q >= 5 / STAGE_COUNT ? STAGE_COUNT - 1 : fromIndex + transitionProgress

      // One panel = 100% of the track's one-panel-wide box (the six
      // viewport-wide columns overflow it), exactly like the About track.
      const next = panelPosition <= 0 ? '' : `${pct(-panelPosition * 100)}%`
      if (next !== lastT) {
        lastT = next
        track.style.translate = next
      }
    }

    // Crossing the breakpoint re-states the current progress immediately:
    // entering/leaving the phone band must not wait for the next scroll
    // frame to clear or apply the track shift.
    const onBreakpoint = () => apply(lastP)
    mq.addEventListener('change', onBreakpoint)

    const unsubscribe = subscribeScrollProgress(apply)
    return () => {
      unsubscribe()
      mq.removeEventListener('change', onBreakpoint)
      // Leave no inline state behind on unmount.
      track.style.translate = ''
    }
  }, [])

  return null
}
