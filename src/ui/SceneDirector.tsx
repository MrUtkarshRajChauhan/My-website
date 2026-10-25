import { useEffect } from 'react'
import { subscribeScrollProgress } from '../progressBus'
import {
  ABOUT_EXIT_START,
  APPROACH_EXIT,
  CLOSING_EXIT,
  INTRO_EXIT,
  PHIL_EXIT,
  VALUES_EXIT,
} from '../aboutBeats'

/**
 * SCENE DIRECTOR — the About -> Expertise exit.
 *
 * The five existing About blocks are moved, not rebuilt: this component owns
 * no markup, it only transforms the already-rendered `<section>` elements with
 * pure functions of the shared scroll progress, so the exit is fully
 * deterministic and reversible.
 *
 * LEFT-lane blocks (Introduction, My Approach) slide LEFT straight off the
 * screen — their path never crosses the subject.
 *
 * RIGHT-lane blocks (Philosophy, What I Value, Closing) sit opposite the
 * subject. As each one travels LEFT its leading (left) edge would eventually
 * enter the protected central band, so each carries a short, scroll-synchronised
 * dissolve that reaches zero opacity exactly as its leading edge meets the band
 * boundary. The slide then continues while the block is invisible until it is
 * completely outside the viewport.
 *
 * Geometry is measured once (and on real viewport/layout changes), never on the
 * per-frame path. No new ScrollTrigger, pin, timer or scroll listener.
 */

type Target = {
  el: HTMLElement
  window: readonly [number, number]
  fade: boolean
  initLeft: number
  unitX: number
  lastT: string | null
  lastO: string | null
}

const SAFETY = 8
const LAMBDA = 0.24
/**
 * Right edge of the protected central subject band. The About right lane
 * begins at 67.3vw and the verified subject silhouette peaks at ~60.6vw, so
 * this boundary sits clear of both, giving the dissolve its safe margin.
 */
const BAND_RIGHT_FRAC = 0.62

const BLOCKS: readonly { sel: string; window: readonly [number, number]; fade: boolean }[] = [
  { sel: '.about-intro', window: INTRO_EXIT, fade: false },
  { sel: '.about-philosophy', window: PHIL_EXIT, fade: true },
  { sel: '.about-approach', window: APPROACH_EXIT, fade: false },
  { sel: '.about-values', window: VALUES_EXIT, fade: true },
  { sel: '.about-closing', window: CLOSING_EXIT, fade: true },
]

export function SceneDirector() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const targets: Target[] = []
    for (const b of BLOCKS) {
      const el = document.querySelector<HTMLElement>(b.sel)
      if (!el) continue
      targets.push({
        el,
        window: b.window,
        fade: b.fade,
        initLeft: 0,
        unitX: 0,
        lastT: null,
        lastO: null,
      })
    }

    if (targets.length === 0) return

    let bandRight = 0
    // The phone-band panel track (AboutPanelTrack) translates .about-stage by
    // panel-sized percentages. Exit geometry must be expressed in the track's
    // REST coordinates, so whenever the track carries a shift at measure time
    // (e.g. a mid-At remeasure), subtract its pixel equivalent. On desktop the
    // track never carries a translate, so this reads 0 and nothing changes.
    let trackShift = 0
    const measureTrack = () => {
      const stage = document.querySelector<HTMLElement>('.about-stage')
      if (!stage) return (trackShift = 0)
      const raw = parseFloat(stage.style.translate)
      trackShift = raw ? (raw / 100) * stage.getBoundingClientRect().width : 0
    }

    const measure = () => {
      measureTrack()
      bandRight = window.innerWidth * BAND_RIGHT_FRAC
      for (const t of targets) {
        let r = t.el.getBoundingClientRect()
        if (trackShift) {
          // Shift back into rest coordinates (left/right only; the track
          // never moves vertically).
          r = {
            x: r.x - trackShift,
            y: r.y,
            width: r.width,
            height: r.height,
            top: r.top,
            right: r.right - trackShift,
            bottom: r.bottom,
            left: r.left - trackShift,
          } as DOMRect
        }
        if (r.width === 0 && r.height === 0) {
          // Degenerate rect: a mobile phone-panel cell measured while its
          // content is empty or opacity-hidden (mobile.css keeps every panel
          // cell mounted permanently). The cell spans its full panel width,
          // so its rest side edges are the cell's edges; measuring those keeps
          // the exit aim exact even from a cold load at progress 0. The
          // track's shift is already folded out above, so the value is rest-
          // geometry in every case.
          const stage = t.el.closest('.about-stage')
          if (stage) r = stage.getBoundingClientRect()
        }
        t.initLeft = r.left
        t.unitX = r.right + SAFETY
      }
    }

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
    const ease = (t: number) => LAMBDA * t + (1 - LAMBDA) * t * t
    const local = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
    const smoothstep = (v: number) => {
      const t = clamp01(v)
      return t * t * (3 - 2 * t)
    }
    const px = (v: number) => Math.round(v * 100) / 100

    const apply = (p: number) => {
      for (const t of targets) {
        if (reduced) {
          // No motion: hide as a single scroll-tied step at the exit boundary.
          const hidden = p >= ABOUT_EXIT_START
          const next = hidden ? 'hidden' : ''
          if (t.el.style.visibility !== next) t.el.style.visibility = next
          continue
        }

        const u = ease(local(p, t.window[0], t.window[1]))
        const tt = u <= 0 ? '' : `translateX(${px(-t.unitX * u)}px)`
        if (tt !== t.lastT) {
          t.lastT = tt
          t.el.style.transform = tt
        }

        let oo = ''
        if (t.fade && u > 0) {
          const curLeft = t.initLeft - t.unitX * u
          const ratio = (curLeft - bandRight) / Math.max(1, t.initLeft - bandRight)
          oo = ratio >= 1 ? '' : String(px(smoothstep(ratio)))
        }
        if (oo !== t.lastO) {
          t.lastO = oo
          t.el.style.opacity = oo
        }
      }
    }

    measure()
    const remeasure = () => measure()
    window.addEventListener('resize', remeasure)
    window.addEventListener('load', remeasure)
    document.fonts?.ready.then(remeasure).catch(() => {})

    const unsubscribe = subscribeScrollProgress(apply)
    return () => {
      unsubscribe()
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('load', remeasure)
      for (const t of targets) {
        t.el.style.transform = ''
        t.el.style.opacity = ''
        t.el.style.visibility = ''
      }
    }
  }, [])

  return null
}
