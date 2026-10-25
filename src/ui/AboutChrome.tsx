import { useEffect, useRef } from 'react'
import { subscribeScrollProgress } from '../progressBus'
import {
  ABOUT_EXIT_END,
  ABOUT_EXIT_START,
  ABOUT_START,
  APPROACH_WINDOW,
  CLOSING_WINDOW,
  EXPERTISE_END,
  EXPERTISE_START,
  INTRO_WINDOW,
  PHIL_WINDOW,
  VALUES_WINDOW,
} from '../aboutBeats'

/**
 * ABOUT CHROME — the two structural indicators of the About composition:
 *
 *   · LEFT  — a vertical "ABOUT" section marker on the outer left edge.
 *   · RIGHT — the five-item progress rail (INTRO / PHILOSOPHY / APPROACH /
 *             VALUES / CLOSING).
 *
 * Both are presentation only. Neither is navigation: there is no
 * click-to-scroll, no snap, no independent scrolling, no ScrollTrigger, and
 * no pointer interaction. They render as plain DOM whose classes are toggled
 * from the same shared scroll progress the blocks use, so they cost nothing
 * per frame beyond a cached class check.
 *
 * The rail mirrors the composition state:
 *   before its window -> idle
 *   inside its window -> active (mint, the block currently being introduced)
 *   after its window  -> done
 * Once every block has entered the rail settles into the all-`done` state
 * rather than leaving one item highlighted.
 *
 * The whole chrome only becomes visible once the About entry boundary is
 * reached, so nothing About-related shows during the Home exit, and it fades
 * out again if the user scrolls back above that boundary.
 *
 * Marked aria-hidden: both are decorative reinforcement of blocks that are
 * already in the DOM, not a second navigation surface.
 */

const RAIL_ITEMS = [
  { label: 'INTRO', window: INTRO_WINDOW },
  { label: 'PHILOSOPHY', window: PHIL_WINDOW },
  { label: 'APPROACH', window: APPROACH_WINDOW },
  { label: 'VALUES', window: VALUES_WINDOW },
  { label: 'CLOSING', window: CLOSING_WINDOW },
] as const

export function AboutChrome() {
  const chromeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chrome = chromeRef.current
    if (!chrome) return

    const items = Array.from(chrome.querySelectorAll<HTMLElement>('.about-rail__item'))
    const rail = chrome.querySelector<HTMLElement>('.about-rail')
    const marker = chrome.querySelector<HTMLElement>('.about-marker')
    const markerLabel = chrome.querySelector<HTMLElement>('.about-marker__label')
    const lastState: string[] = items.map(() => '')

    const EXIT = ABOUT_EXIT_END - ABOUT_EXIT_START
    const ENTRY = EXPERTISE_END - EXPERTISE_START
    // Chrome leaves with the composition: an early, small left drift plus a
    // fade, both gone well before the handoff boundary.
    const RAIL_A = ABOUT_EXIT_START + 0.1 * EXIT
    const RAIL_B = ABOUT_EXIT_START + 0.5 * EXIT
    const MARK_A = ABOUT_EXIT_START + 0.04 * EXIT
    const MARK_B = ABOUT_EXIT_START + 0.44 * EXIT
    // The marker re-enters as EXPERTISE at the handoff, from the right.
    const MARK_IN = EXPERTISE_START + 0.35 * ENTRY

    // Accelerating curve shared with the Home exits.
    const ease = (t: number) => 0.24 * t + 0.76 * t * t
    const local = (p: number, a: number, b: number) =>
      Math.max(0, Math.min(1, (p - a) / (b - a)))
    const px = (v: number) => Math.round(v * 100) / 100

    let lastVisible = false
    let lastScrub = false
    let lastLabel = 'ABOUT'
    let lastRailT: string | null = null
    let lastRailO: string | null = null
    let lastMarkT: string | null = null
    let lastMarkO: string | null = null

    const apply = (progress: number) => {
      const visible = progress >= ABOUT_START
      if (visible !== lastVisible) {
        lastVisible = visible
        chrome.classList.toggle('about-chrome--visible', visible)
      }

      // Scroll-scrubbed values must not be smeared by the reveal transition.
      const scrub = progress >= ABOUT_EXIT_START - 1e-6
      if (scrub !== lastScrub) {
        lastScrub = scrub
        chrome.classList.toggle('about-chrome--scrub', scrub)
      }

      RAIL_ITEMS.forEach((item, i) => {
        const el = items[i]
        if (!el) return
        const [start, end] = item.window
        const state = progress < start ? 'idle' : progress < end ? 'active' : 'done'
        if (state !== lastState[i]) {
          lastState[i] = state
          el.dataset.state = state
        }
      })

      // --- RIGHT rail: exits left with the composition -------------------
      if (rail) {
        let t: string
        let o: string
        if (progress < RAIL_A) {
          t = ''
          o = ''
        } else {
          const e = ease(local(progress, RAIL_A, RAIL_B))
          t = `translate(${px(-38 * e)}px, -50%)`
          o = String(px(1 - e))
        }
        if (t !== lastRailT) {
          lastRailT = t
          rail.style.transform = t
        }
        if (o !== lastRailO) {
          lastRailO = o
          rail.style.opacity = o
        }
      }

      // --- LEFT marker: exits, then returns as EXPERTISE ------------------
      if (marker) {
        let t: string
        let o: string
        if (progress < MARK_A) {
          t = ''
          o = ''
        } else if (progress < MARK_B) {
          const e = ease(local(progress, MARK_A, MARK_B))
          t = `translateX(${px(-20 * e)}px)`
          o = String(px(1 - e))
        } else if (progress < EXPERTISE_START) {
          t = 'translateX(-20px)'
          o = '0'
        } else {
          const e = ease(local(progress, EXPERTISE_START, MARK_IN))
          t = `translateX(${px(16 * (1 - e))}px)`
          o = String(px(e))
        }
        if (t !== lastMarkT) {
          lastMarkT = t
          marker.style.transform = t
        }
        if (o !== lastMarkO) {
          lastMarkO = o
          marker.style.opacity = o
        }
      }

      if (markerLabel) {
        const label = progress >= EXPERTISE_START ? 'EXPERTISE' : 'ABOUT'
        if (label !== lastLabel) {
          lastLabel = label
          markerLabel.textContent = label
        }
      }
    }

    return subscribeScrollProgress(apply)
  }, [])

  return (
    <div className="about-chrome" ref={chromeRef} aria-hidden="true">
      {/* LEFT — vertical section marker. */}
      <div className="about-marker">
        <span className="about-marker__dot" />
        <span className="about-marker__rule" />
        <span className="about-marker__label">ABOUT</span>
      </div>

      {/* RIGHT — five-item progress rail. */}
      <div className="about-rail">
        <span className="about-rail__line" />
        <ol className="about-rail__list">
          {RAIL_ITEMS.map((item) => (
            <li key={item.label} className="about-rail__item" data-state="idle">
              <span className="about-rail__label">{item.label}</span>
              <span className="about-rail__dot" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
