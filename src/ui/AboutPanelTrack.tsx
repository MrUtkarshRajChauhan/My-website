import { useEffect } from 'react'
import { subscribeScrollProgress } from '../progressBus'
import { PANEL_AB, PANEL_BC } from '../aboutBeats'

/**
 * ABOUT PHONE PANELS (<= 767px) — the horizontal three-panel track driver.
 *
 * On phones the five About blocks group into three panels —
 *     Panel A: Introduction + Philosophy
 *     Panel B: Approach + Values
 *     Panel C: Closing
 * — that slide across ONE shared track instead of stacking (the desktop
 * lanes and the 768–900px staged band are untouched). The panels hold their
 * positions like a film strip: A is on stage at the About entry, B replaces
 * it across the A -> B transition window, C replaces B across B -> C.
 *
 * The `.about-stage` element (App.tsx) IS the track: mobile.css lays it out
 * as a grid of three viewport-wide columns placed edge to edge, bottom
 * anchored. This component does nothing but translate that one element —
 * never the nav, hero metadata, ABOUT rail or any other chrome.
 *
 * Movement model (one authoritative owner):
 *   panelPosition  = 0 | 1 | 2 at rest, and [0..1] the eased slide between.
 *   translate      = -(panelPosition * 100)% of the track's own width.
 * The track's own box is exactly one panel wide (its three columns overflow
 * it), so "-100%" moves one full panel: identical to the classic
 * `-(100/3) * panelPosition` percent applied to a three-panel-wide strip —
 * the same geometry, expressed against the box that actually exists, and
 * resize-free (percentages track the viewport themselves, no listener).
 *
 * Both panels move through the SAME single value during a transition: the
 * outgoing panel leaves left while the incoming panel enters from the right,
 * synchronized by construction (they are fixed tracks on one strip). No
 * per-panel transforms are ever written, so nothing can double up.
 *
 * Position is a PURE function of the shared About progress: the windows are
 * aboutBeats' own PANEL_AB / PANEL_BC constants (derived from the entrance
 * windows — see that file), the easing is the project's smoothstep, and the
 * clamp makes every progress value map to exactly one translate. Reversing
 * the scroll therefore re-reverses any half-completed slide continuously,
 * and no imperative state can desync it. The trim-out clip so an off-stage
 * panel can never paint or widen the document is mobile.css's `.ui-layer
 * { overflow-x: clip }` horizontal clip window (clip can never become a
 * scroll container and always leaves the vertical axis alone).
 *
 * Like every other About driver this is a plain progressBus subscription:
 * no second ScrollTrigger, no timers, no rAF loops, no extra event
 * listeners, no React state on the animation path (writes are cached).
 * Reduced motion: the panel geometry stays scrubbed (it moves only with
 * the user's own scrolling — the same convention the staged band and the
 * Workspace exit already follow); no independent animation exists here.
 */

// Mobile responsiveness has been removed from this build: the retired
// phone band can never match, so this driver only ever clears the track's
// translate and the desktop composition applies at every viewport width.
const PANEL_QUERY = '(min-width: 9999px)'

export function AboutPanelTrack() {
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>('.about-stage')
    if (!stage) return

    const mq = window.matchMedia(PANEL_QUERY)

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
    const local = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
    // The project's smoothstep (same shape SceneDirector uses): soft ease
    // into and out of each panel slide, identical in both directions.
    const smoothstep = (t: number) => {
      const n = clamp01(t)
      return n * n * (3 - 2 * n)
    }
    // 4 decimals: on a 320px panel one unit is 3.2e-3 px — beyond sub-pixel.
    const pct = (v: number) => Math.round(v * 10000) / 10000

    let lastP = -1
    let lastT = null as string | null

    const apply = (p: number) => {
      lastP = p

      if (!mq.matches) {
        // Desktop (>= 768px): the track has no horizontal role at all, so it
        // must carry no inline translate (SceneDirector measures and slides
        // the blocks in viewport coordinates on those bands).
        if (lastT !== '') {
          lastT = ''
          stage.style.translate = ''
        }
        return
      }

      // The pure panel-position map over the About span.
      const pos =
        p <= PANEL_AB[0]
          ? 0
          : p < PANEL_AB[1]
            ? smoothstep(local(p, PANEL_AB[0], PANEL_AB[1]))
            : p <= PANEL_BC[0]
              ? 1
              : p < PANEL_BC[1]
                ? 1 + smoothstep(local(p, PANEL_BC[0], PANEL_BC[1]))
                : 2

      // One panel = 100% of the track's one-panel-wide box.
      const next = pos <= 0 ? '' : `${pct(-pos * 100)}%`
      if (next !== lastT) {
        lastT = next
        stage.style.translate = next
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
      stage.style.translate = ''
    }
  }, [])

  return null
}
