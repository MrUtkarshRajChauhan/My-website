import { useEffect, useRef } from 'react'
import { subscribeScrollProgress } from '../progressBus'
import {
  APPROACH_WINDOW,
  CLOSING_WINDOW,
  INTRO_WINDOW,
  PANEL_AB,
  PANEL_BC,
  PHIL_WINDOW,
  VALUES_WINDOW,
} from '../aboutBeats'

/**
 * Shared About entrance driver.
 *
 * Every About block uses the SAME mechanism, so the five entrance animations
 * are one piece of code, not five copies:
 *
 *   - The block's content is parked fully beyond the RIGHT edge of its own
 *     clip lane (`translateX(calc(100% + overscan))`). Because the lane is
 *     the clip, the text can only ever be revealed through the lane's own
 *     boundaries — it never sweeps across the central subject.
 *   - As the shared cinematic progress crosses [start, end] the block slides
 *     LEFT into the lane on the project's existing cubic ease-out (quick
 *     start, soft settle), with a restrained opacity reveal.
 *   - At/after `end` the inline transform/opacity clear to '' so the CSS
 *     resting state is the exact final position, and the block simply STAYS
 *     there. There is no exit window: a later block entering never removes an
 *     earlier one.
 *
 * Transform and opacity are pure functions of the same progress value, so
 * reversing the scroll retreats the block exactly, and the same progress can
 * only ever produce the same frame (no timers, no flags, no React state on
 * the animation path — writes are cached per value).
 *
 * Reduced motion: the slide is dropped, but the block still cannot be visible
 * before its boundary, so visibility follows the same scroll-scrubbed model
 * (opacity 0 before `start`, fully opaque at/after it) rather than animating
 * independently of the user's scrolling.
 *
 * ------------------------------------------------------------------------
 * MOBILE STAGE (768–900px) AND PHONE PANELS (<= 767px)
 * ------------------------------------------------------------------------
 * Between 900 and 768px the five blocks cannot coexist legibly in one viewport
 * band, so they advance as a single stage: the NEWEST block whose entrance has
 * begun owns the shared band and every earlier block steps aside. Everything
 * about the desktop composition is preserved — the order, the copy, the
 * entrance windows, the reveal easing, the persistent mechanic and the joint
 * exit — only the coexistence changes, and even that is written from the same
 * shared progress (no timers, no second engine):
 *
 *   visible(block i)  ⇔  window[i].start <= p < window[i+1].start
 *
 * In the phone band (<= 767px) the composition is THREE PANELS instead:
 * Panel A = Introduction + Philosophy, Panel B = Approach + Values, Panel C =
 * Closing (AboutPanelTrack.tsx slides the whole track horizontally). Blocks
 * NEVER step aside from per-block ownership here — the panel a block belongs
 * to is fixed, and the track's panel switch is what retires whole panels at
 * their derived transition windows (aboutBeats PANEL_AB / PANEL_BC):
 *
 *   panel membership(i) = [A, A, B, B, C][i]   (stage order)
 *
 *   visible(block i)  ⇔  its own (remapped) reveal window has begun
 *
 * The reveal windows of every later panel member are remapped INTO their own
 * panel's transition window (PANEL_REVEAL below), so no incoming text can
 * show before its panel starts sliding, and each incoming panel is fully
 * revealed exactly when its slide settles. Blocks inside a panel hold their
 * positions and stay resident — an outgoing panel leaves only through the
 * track translation, never because its blocks were hidden.
 *
 * Both drivers are pure functions of the one shared progress value, so
 * reversing the scroll retreats every block and every panel exactly.
 *
 * The stage-ownership switch (newest-only, 768–900px) drives ONE CSS class on
 * the block's own <section> (`is-stage-active`) that the mobile stylesheet
 * turns into the visible state; on desktop and in the phone-panel band the
 * class is simply removed, so those compositions never see it. In the panel
 * band visibility is instead the scrubbed inline opacity ramp each hook
 * writes on its own block content — the panel cells exist permanently in the
 * track grid, so there is no display mounting to do (and therefore no
 * layout shift for the exit runway or SceneDirector to chase). SceneDirector's
 * exit slide-off still owns the sections' transforms/opacity during the
 * About -> Expertise exit and works unchanged, because the panel track writes
 * the SEPARATE CSS `translate` property on the shared track container (not
 * the sections, not the content wrappers, not `transform`).
 */

/**
 * The five blocks in stage order. Their start values are strictly increasing
 * (see aboutBeats.ts), so "the newest block whose entrance has begun" is the
 * last threshold p has crossed. The hook resolves its own block by comparing
 * the (start, end) values it was called with, so adding or reordering a
 * window in aboutBeats.ts cannot silently desynchronise the stage map.
 */
const STAGE_WINDOWS = [
  INTRO_WINDOW,
  PHIL_WINDOW,
  APPROACH_WINDOW,
  VALUES_WINDOW,
  CLOSING_WINDOW,
] as const

// Mobile responsiveness has been removed from this build: the desktop
// composition is authoritative at every viewport width, so both retired
// bands can never match and this hook always runs its desktop slide path
// (SceneDirector owns the staged slides, exactly as on the desktop).
const STAGE_QUERY = '(min-width: 9999px)'

// Retired phone-panel band (see STAGE_QUERY): can never match.
const PANEL_QUERY = '(min-width: 9999px)'

/**
 * Phone-panel reveal windows (<= 767px ONLY), derived from the window
 * constants — no hand-picked timings. Panel order maps one-to-one onto the
 * stage order: Panels A/B/C own the stage pairs (01+02 | 03+04 | 05).
 *
 * Panel A's members reveal exactly as authored: their windows ARE Panel A's
 * formation, and both members are fully settled before the track's first
 * transition window opens (PHIL end == PANEL_AB start).
 *
 * Every later panel member reveals INSIDE its own panel's transition window
 * instead: an incoming panel must not show any text before its own slide
 * begins, so Approach and Values split PANEL_AB at its midpoint (Approach
 * ramps over the first half, Values over the second — entering panel, one
 * composition, never an early reveal), and Closing fills PANEL_BC. Each
 * member is fully revealed exactly when its panel's slide settles, so there
 * is never a half-empty resting panel.
 */
const PANEL_REVEAL = (() => {
  const abMid = PANEL_AB[0] + (PANEL_AB[1] - PANEL_AB[0]) * 0.5
  return [
    INTRO_WINDOW,
    PHIL_WINDOW,
    [PANEL_AB[0], abMid],
    [abMid, PANEL_AB[1]],
    PANEL_BC,
  ] as const
})()

export function useAboutEntrance(start: number, end: number) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const content = ref.current
    if (!content) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
    const local = (p: number, from: number, to: number) =>
      clamp01((p - from) / (to - from))
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3)
    const px = (v: number) => Math.round(v * 100) / 100
    // Small fixed bleed so the parked block is fully clear of the clip edge
    // even on sub-pixel rounding (100% of the content box == one lane width).
    const OVERSCAN = 8

    // --- mobile stage wiring ------------------------------------------------
    // The section is the block's own root (about-*__content -> about-*__clip
    // -> about-*). Blocks outside the About stage map (the Expertise left
    // lane uses this same hook) resolve to index -1 and are never staged.
    const section = content.parentElement?.parentElement ?? null
    const stageIndex = STAGE_WINDOWS.findIndex(
      ([wStart, wEnd]) => wStart === start && wEnd === end,
    )
    const stageMq = window.matchMedia(STAGE_QUERY)
    // In the phone panel band (<= 767px) whole panels own the stage (see the
    // phone-panel notes above); the newest-only switch lives only between
    // 768 and 900px.
    const panelMq = window.matchMedia(PANEL_QUERY)
    let lastP = -1
    let stageClass = false
    // Phone-panel band only: whether this block's wash is currently revealed
    // (the class is written in apply(), guarded by the same cached check).
    let revealClass = false

    const applyStage = (p: number) => {
      if (!section || stageIndex < 0) return

      if (!stageMq.matches) {
        // Desktop: reject the class entirely so the coexisting composition
        // is exactly as it was before this hook grew a mobile stage.
        if (stageClass) {
          stageClass = false
          section.classList.remove('is-stage-active')
        }
        return
      }

      if (panelMq.matches) {
        // Phone panels: block membership never steps aside — the track's
        // panel switch (AboutPanelTrack) retires whole panels, and
        // visibility here is the scrubbed opacity ramp each block's own
        // content carries (see apply() below). No stage class exists in
        // this band, so make sure none is left behind when crossing the
        // breakpoint in either direction.
        if (stageClass) {
          stageClass = false
          section.classList.remove('is-stage-active')
        }
        return
      }

      // The newest block whose entrance has begun owns the stage…
      let stage = -1
      for (let i = 0; i < STAGE_WINDOWS.length; i += 1) {
        if (p >= STAGE_WINDOWS[i][0]) stage = i
        else break
      }
      const active = stage === stageIndex
      if (active !== stageClass) {
        stageClass = active
        section.classList.toggle('is-stage-active', active)
      }
    }

    // The reveal is a pure function of the shared progress; on the mobile
    // stage the block's own end is replaced by the next block's start (the
    // handoff) so the reveal completes exactly there (see the mobile notes
    // in the header comment).
    let lastT: string | null = null
    let lastO: string | null = null

    const apply = (progress: number) => {
      lastP = progress
      applyStage(progress)

      // Phone panels (<= 767px): the reveal is in place across the member's
      // own PANEL window (PANEL_REVEAL), the track translation is owned by
      // AboutPanelTrack, and the panel membership never steps aside. Blocks
      // revealed at 1 stay in the track's cells — an outgoing panel leaves
      // only through the shared track translate, never through these values.
      const panelMode = stageIndex >= 0 && panelMq.matches

      const staged = stageIndex >= 0 && stageMq.matches && !panelMode
      const revealTo =
        staged && stageIndex < STAGE_WINDOWS.length - 1
          ? STAGE_WINDOWS[stageIndex + 1][0]
          : end
      const e = panelMode
        ? easeOutCubic(local(progress, PANEL_REVEAL[stageIndex][0], PANEL_REVEAL[stageIndex][1]))
        : easeOutCubic(local(progress, start, revealTo))

      let t: string
      let o: string
      if (panelMode) {
        // Mobile panel: reveal in place — no slide, no clip-lane sweep. The
        // same eased opacity ramp over the remapped panel window. The block
        // wash lives on the permanently mounted section, so it is gated on a
        // class that flips at exactly this eased value's first paint —
        // the wash then reveals and retires with the text, not before it.
        t = ''
        o = e <= 0 ? '0' : e >= 1 ? '' : String(px(e))
        const revealed = e > 0
        if (section && revealed !== revealClass) {
          revealClass = revealed
          section.classList.toggle('is-revealed', revealed)
        }
      } else if (staged) {
        // Mobile stage: reveal in place — no slide, no clip-lane sweep. The
        // same eased opacity ramp, completing at the handoff.
        t = ''
        o = e <= 0 ? '0' : e >= 1 ? '' : String(px(e))
      } else if (reduced) {
        // No slide; a functional hide/reveal only.
        t = ''
        o = e <= 0 ? '0' : ''
      } else {
        t =
          e <= 0
            ? `translateX(calc(100% + ${OVERSCAN}px))`
            : e >= 1
              ? ''
              : `translateX(calc(${px((1 - e) * 100)}% + ${px(OVERSCAN * (1 - e))}px))`
        o = e <= 0 ? '0' : e >= 1 ? '' : String(px(e))
      }

      if (t !== lastT) {
        lastT = t
        content.style.transform = t
      }
      if (o !== lastO) {
        lastO = o
        content.style.opacity = o
      }
    }

    // A real resize across 900px must re-state the stage immediately (the
    // cached lastP makes the switch deterministic), never wait for the next
    // scroll frame. Re-running apply() also re-states the inline transform/
    // opacity for the new mode: the two modes write different values, and
    // the string caches skip only writes that would be identical anyway.
    const onStageBreakpoint = () => apply(lastP)
    stageMq.addEventListener('change', onStageBreakpoint)
    panelMq.addEventListener('change', onStageBreakpoint)

    const unsubscribe = subscribeScrollProgress(apply)
    return () => {
      unsubscribe()
      stageMq.removeEventListener('change', onStageBreakpoint)
      panelMq.removeEventListener('change', onStageBreakpoint)
      // Leave no inline state behind on unmount.
      content.style.transform = ''
      content.style.opacity = ''
      if (section) {
        section.classList.remove('is-stage-active')
        section.classList.remove('is-revealed')
      }
    }
  }, [start, end])

  return ref
}
