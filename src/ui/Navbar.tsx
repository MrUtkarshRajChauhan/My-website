/**
 * NAVBAR — Step 2.
 *
 * Lives inside .ui-layer (layer 3), independent of CinematicCanvas. The
 * three zones match the supplied reference: monogram left, labels centred,
 * CTA right.
 *
 * Nothing here positions itself against the window: .navbar__inner is a
 * `1fr auto 1fr` grid so the label group is centred by construction, and the
 * labels are a flex row. The band carries no rule of its own; the one line in
 * the navbar is a single continuous progress track that hangs below the whole
 * label group.
 *
 * NAVIGATION — this is one continuous scrolling experience, not five routes,
 * so every label is a real anchor that is intercepted and routed through the
 * existing Lenis instance. Nothing here resets React state, frame indices or
 * animation properties: a destination is reached by moving the scroll
 * position, which stays the single source of truth, so the film, the Expertise
 * exit runway, the closing statement and the Work / Contact entrances all
 * play and reverse on their own, forwards or backwards, without any of them
 * being driven by hand.
 *
 * PROGRESS TRACK — beneath the labels, one hairline (the label group's own
 * `.navbar__list::after`) runs from HOME's left boundary to CONTACT's right
 * boundary, one mint fill covers the part of that run already travelled, and
 * one bead sits exactly at the fill's end. The mapping is continuous by
 * construction: six scroll boundaries S0..S5 and six measured track positions
 * b0..b5, with the bead at `b_i + u * (b_{i+1} - b_i)` inside segment i. At
 * every shared boundary the outgoing segment's limit is b_{i+1} and the
 * incoming segment's limit is the same b_{i+1}, so no scroll position — in
 * either direction — can produce a jump, a reset or a teleport. Only the
 * scroll position drives it: no transition, no keyframe, no timer, no second
 * animation loop, so the bead tracks Lenis instead of lagging behind it.
 *
 * Nothing here adds a ScrollTrigger, a pin, a bus, a timer or a rAF loop.
 */

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { subscribeScrollProgress } from '../progressBus'
import {
  ABOUT_START,
  EXPERTISE_START,
  ABOUT_READY,
  ABOUT_EXIT_START,
} from '../aboutBeats'
import { WORK01_ENTRY_PROGRESS } from './Work'
import { getLenis } from '../lenisHandle'

type NavigationKey = 'home' | 'about' | 'expertise' | 'work' | 'contact'

type NavItem = {
  key: NavigationKey
  label: string
  href: string
}

const NAV_ITEMS: readonly NavItem[] = [
  { key: 'home', label: 'HOME', href: '#home' },
  { key: 'about', label: 'ABOUT', href: '#about' },
  { key: 'expertise', label: 'EXPERTISE', href: '#expertise' },
  { key: 'work', label: 'WORK', href: '#work' },
  { key: 'contact', label: 'CONTACT', href: '#contact' },
]

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)

/**
 * The cinematic pin's own scroll length, in viewport heights: the literal the
 * CinematicCanvas trigger ends on (`end: () => '+=' + innerHeight * 6`) and the
 * point the runway trigger starts from. Read, never changed, and only used
 * before the trigger exists — once it does, its live `start`/`end` take over.
 */
const CINEMATIC_VH = 6

/**
 * Where ABOUT is CLICKED TO.
 *
 * About is fully readable on the closed interval between the moment its last
 * entrance completes (`ABOUT_READY`) and the moment its exit begins
 * (`ABOUT_EXIT_START`). Both are exported by `aboutBeats`, the single source
 * of truth for those thresholds, so no number is duplicated here. The target
 * is that interval's midpoint — the one point that is never inside an entrance
 * nor an exit, so a visitor always lands on a legible composition.
 */
const ABOUT_STABLE_MID = (ABOUT_READY + ABOUT_EXIT_START) / 2

/**
 * The measured navigation model. Three views of one measurement pass:
 *
 *   • `scroll`  — the six ordered scroll boundaries S0..S5, splitting the page
 *                 into five continuous progress segments;
 *   • `track`   — the six measured track positions b0..b5;
 *   • `targets` — the stable click destination for each key.
 *
 * Click destinations and progress segments are separate concerns that share a
 * boundary definition: a click lands on a section's stable state, the bead
 * traverses the segment that section is current in. Keeping both on this one
 * object is what stops them drifting apart after a layout change.
 */
type NavGeometry = {
  scroll: number[]
  track: number[]
  targets: Record<NavigationKey, number>
}

/**
 * The film's own ScrollTrigger, read rather than recomputed. It is the only
 * pinned trigger on the page — `pin: true` resolves the trigger's `pin` back to
 * the canvas element itself — so its live `start`/`end` are the authoritative
 * S0 and the end of the film. No pixel constant is copied out of
 * CinematicCanvas, and a change to the pin geometry is picked up on the next
 * refresh instead of going stale here.
 *
 * Before the 183 frames have preloaded the trigger does not exist, so the
 * literal CinematicCanvas itself uses (a viewport-height multiple anchored at
 * the top of the document) stands in until the first refresh.
 */
function cinematicRange(): { start: number; end: number } {
  const canvas = document.querySelector('canvas')
  if (canvas) {
    const trigger = ScrollTrigger.getAll().find(
      (candidate) => (candidate.pin as unknown) === canvas,
    )
    if (
      trigger &&
      Number.isFinite(trigger.start) &&
      Number.isFinite(trigger.end) &&
      trigger.end > trigger.start
    ) {
      // GSAP writes -0.001 as its "at or before the start" sentinel for pinned
      // triggers; a scroll position itself cannot go below 0.
      return { start: Math.max(0, trigger.start), end: trigger.end }
    }
  }
  return { start: 0, end: window.innerHeight * CINEMATIC_VH }
}

/**
 * An element's untransformed layout position, in document coordinates.
 *
 * `offsetTop` is a layout value: unlike `getBoundingClientRect` it is not
 * affected by the entrance transforms ScrollTrigger writes onto sections, so a
 * destination measured while a section is mid-animation still resolves to the
 * section's real box rather than to a temporarily shifted one.
 */
function layoutTop(element: HTMLElement): number {
  let top = 0
  let node: HTMLElement | null = element
  while (node) {
    top += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return top
}

/**
 * b0..b5, in pixels relative to the track's own left edge.
 *
 * b0 and b5 are the label group's own edges, so the run spans exactly HOME's
 * left boundary to CONTACT's right boundary — the same box the base hairline
 * spans — and b1..b4 are the midpoints between neighbouring link centres, so
 * each label owns the stretch it sits in.
 *
 * Measured as one group, only when the model is rebuilt — mount, window
 * resize, ScrollTrigger.refresh, font load, and a change to the document's own
 * height. Never per scroll frame.
 */
function measureTrack(list: HTMLElement): number[] {
  const rect = list.getBoundingClientRect()
  const width = rect.width
  const fallback = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => f * Math.max(width, 1))

  const links = list.querySelectorAll<HTMLAnchorElement>('a')
  if (links.length !== NAV_ITEMS.length || width <= 0) return fallback

  const centres: number[] = []
  links.forEach((link) => {
    const box = link.getBoundingClientRect()
    centres.push(box.left + box.width / 2 - rect.left)
  })

  const track = [0]
  for (let i = 0; i < centres.length - 1; i++) {
    track.push((centres[i] + centres[i + 1]) / 2)
  }
  track.push(width)
  return track
}

/**
 * Build the whole model in one pass. Everything the navbar clicks to and
 * everything it draws comes from here, so a change in layout moves the
 * destinations and the progress segments together.
 */
function measureNavGeometry(list: HTMLElement | null): NavGeometry {
  const viewportH = window.innerHeight

  // --- S0..S2: the pinned film --------------------------------------------
  const film = cinematicRange()
  const filmSpan = film.end - film.start
  const filmAt = (progress: number) => film.start + progress * filmSpan

  const S0 = film.start
  const S1 = filmAt(ABOUT_START)
  const S2 = filmAt(EXPERTISE_START)

  // --- S3..S5: the document in normal flow --------------------------------
  // The pin only exists once CinematicCanvas has created its trigger (after
  // the frames preload). Before that the document is in its transient pre-pin
  // layout, where Work and Contact sit far closer to the top than they will a
  // moment later, so measuring them then would report positions that stop
  // being true almost immediately. This is the same settled-document guard the
  // existing Work handoff uses.
  const settled = !!document.querySelector('.pin-spacer')

  const work = settled ? document.getElementById('work') : null
  const contact = settled ? document.getElementById('contact') : null
  const workTop = work ? layoutTop(work) : Infinity
  const contactTop = contact ? layoutTop(contact) : Infinity

  const documentEnd = Math.max(
    0,
    document.documentElement.scrollHeight - viewportH,
  )

  // S3 and S4 are the points at which each in-flow section's FIRST PIXEL
  // reaches the fold — the handoff App.tsx dismisses the film on, the point the
  // closing statement is timed to finish leaving on, and the boundaries the
  // active label has always switched on. Using the same values for the label
  // and for the bead is what makes them agree about which segment the visitor
  // is in, at every position and in both directions.
  const S3 = Number.isFinite(workTop) ? workTop - viewportH : film.end
  const S4 = Number.isFinite(contactTop) ? contactTop - viewportH : documentEnd
  const S5 = documentEnd

  // WORK'S CLICK DESTINATION — the Work01 runway's 'left-entered' milestone,
  // not the bare section root. The section root is the timeline's milestone-0
  // pre-state, where the copy group is intentionally still hidden
  // (`gsap.set(leftGroup, { y: 100, autoAlpha: 0 })`), so a click there would
  // land on a near-empty stage and demand extra scrolling to find the actual
  // composition. The runway trigger is read exactly the way the film's own
  // trigger is read above: live start/end, no pixel constant copied out of
  // Work.tsx, lengths recomputed by its own `invalidateOnRefresh`, and this
  // model rebuilt on ScrollTrigger 'refresh' / resize / document-height
  // changes — so the destination stays exact across resize and reload. Until
  // the runway trigger exists (same settled-document window as `workTop`
  // itself) the fallback is the section root, i.e. the previous behavior.
  const workEntryTarget = (() => {
    if (!Number.isFinite(workTop)) return Infinity
    const runwayTrigger = ScrollTrigger.getAll().find(
      (candidate) =>
        candidate.trigger instanceof HTMLElement &&
        candidate.trigger.classList.contains('work01__runway'),
    )
    if (!runwayTrigger) return workTop
    const { start, end } = runwayTrigger
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return workTop
    }
    return start + (end - start) * WORK01_ENTRY_PROGRESS
  })()

  const scroll = [S0, S1, S2, S3, S4, S5]
  // The bead mapping is piecewise linear over these six values, so they must
  // strictly increase. In the settled document they always do; the guard only
  // matters in the transient pre-pin layout above, where the flow sections are
  // not yet measurable.
  for (let i = 1; i < scroll.length; i++) {
    if (!(scroll[i] > scroll[i - 1])) scroll[i] = scroll[i - 1] + 1
  }

  return {
    scroll,
    track: list ? measureTrack(list) : [0, 0.2, 0.4, 0.6, 0.8, 1],
    targets: {
      // Beginning of the cinematic sequence: the trigger's own start.
      home: S0,
      // Midpoint of About's stable interval, in real scroll pixels.
      about: filmAt(ABOUT_STABLE_MID),
      // The end of the pin: frame 183 reached, with the independent Expertise
      // exit runway still at its initial progress.
      expertise: film.end,
      // The Work01 runway's 'left-entered' milestone (the section root only as
      // a fallback while the runway trigger does not exist yet).
      work: Number.isFinite(workTop) ? workEntryTarget : S3,
      contact: Number.isFinite(contactTop) ? contactTop : S4,
    },
  }
}

/**
 * Scroll position -> (segment index, bead position in track pixels).
 *
 * Piecewise linear over S0..S5, mapping each segment onto the corresponding
 * b_i..b_{i+1}. Continuous by construction: at an interior boundary the
 * outgoing segment's limit is b_{i+1} and the incoming segment starts from the
 * same b_{i+1}, so the bead and the fill pass through every boundary without a
 * discontinuity, and reversing simply retraces the identical function.
 */
function trackPosition(scrollY: number, geometry: NavGeometry) {
  const { scroll: S, track: b } = geometry
  const segments = S.length - 1

  if (scrollY <= S[0]) return { index: 0, x: b[0] }

  for (let i = 0; i < segments; i++) {
    if (scrollY < S[i + 1]) {
      const span = Math.max(1, S[i + 1] - S[i])
      const u = clamp01((scrollY - S[i]) / span)
      return { index: i, x: b[i] + u * (b[i + 1] - b[i]) }
    }
  }

  return { index: segments - 1, x: b[segments] }
}

/**
 * CENTRAL NAVIGATION MODEL — one entry per label, and both of its jobs read
 * the same measured geometry.
 *
 * `getTargetY` is the stable state a click lands on; `progressStart` /
 * `progressEnd` are the segment the bead travels while that section is the
 * current one. Because both come from the same S and b arrays, a transition
 * boundary can move without the click target moving with it, and the other way
 * round, and neither can make the bead jump.
 */
type NavigationModel = {
  key: NavigationKey
  href: string
  getTargetY: () => number
  progressStart: () => number
  progressEnd: () => number
}

function buildNavigationModel(geometry: NavGeometry): NavigationModel[] {
  return NAV_ITEMS.map((item, index) => ({
    key: item.key,
    href: item.href,
    getTargetY: () => geometry.targets[item.key],
    progressStart: () => geometry.scroll[index],
    progressEnd: () => geometry.scroll[index + 1],
  }))
}

/** In-out cubic. Lenis's easing vocabulary is a plain `(t) => value` fn. */
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/**
 * Fast, reversible, interruptible navigation.
 *
 * Lenis owns the scroll — it writes the position on every frame of its own
 * animation — so the only honest way to move is to hand it a destination. A
 * per-call `duration` temporarily overrides the global one without touching
 * the wheel/touch feel, and a second call re-enters that same animation from
 * wherever it currently is, so a new click RETARGETS the running scroll rather
 * than stacking a competing tween. Wheel and touch are never locked, so the
 * visitor can always take over mid-flight.
 *
 * With no Lenis instance — the reduced-motion path, where initSmoothScroll
 * deliberately bails out — there is nothing to smooth, so the position is set
 * directly. That is the same instant jump Lenis itself performs for a
 * reduced-motion visitor, so the behaviour matches either way.
 */
function scrollToY(targetY: number) {
  const target = Math.max(0, targetY)
  const lenis = getLenis()

  if (!lenis) {
    window.scrollTo({ top: target, left: 0, behavior: 'instant' })
    return
  }

  // Lenis caches its scroll limit from the document's height and only
  // recomputes it on a window resize. The document also grows without one —
  // most visibly while the 183 frames preload and the pin-spacer is inserted,
  // and again whenever in-flow content finishes loading — and a stale limit
  // clamps this destination straight back to 0, which would make the click a
  // silent no-op. `resize()` is Lenis's own "recalculate the dimensions" call:
  // it re-reads the document, syncs internal state to the current position,
  // and leaves the running scroll alone. Once per navigation, never per frame.
  lenis.resize()

  const distance = Math.abs(target - window.scrollY)
  const viewports = distance / Math.max(1, window.innerHeight)
  // ~0.55s for anything under a viewport, scaling with distance, capped at
  // 1.15s: long enough to read as a controlled rewind through the existing
  // animations, short enough that nobody waits on it.
  const duration = Math.min(1.15, Math.max(0.55, 0.55 + 0.06 * viewports))

  lenis.scrollTo(target, { duration, easing: easeInOutCubic })
}

export function Navbar() {
  const ctaRef = useRef<HTMLAnchorElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const trackRef = useRef<HTMLSpanElement>(null)

  // The cached measurement. The click handler and every scroll update read
  // this object; only the layout events registered in the effect below ever
  // rebuild it.
  const geometryRef = useRef<NavGeometry | null>(null)

  // ACTIVE SECTION — React state, so the label re-renders at most once per
  // boundary crossing. The continuous values never render: they are written
  // straight onto the track element as two custom properties, exactly as the
  // previous underline did, so no React work happens per scroll frame.
  const [activeIndex, setActiveIndex] = useState(0)

  // MOBILE MENU — the hamburger button and its reveal panel are permanent
  // DOM on the desktop too (CSS hides the button above 900px); on a phone
  // they become the band's only navigation. The menu is one boolean state:
  // open/close toggling is instant, focus-aware and escape-aware.
  //
  //   * Opening moves focus to the panel (tabIndex -1), so keyboard users
  //     start tabbing INSIDE the menu; links tab in DOM order.
  //   * Escape closes it and returns focus to the hamburger.
  //   * A pointerdown outside both the panel and the button closes it.
  //   * When the window grows back to desktop width (>= 901px) the menu
  //     closes, because the band's labels — the desktop navigation — come
  //     back with it.
  //
  // The page is deliberately NOT locked while the menu is open: the film,
  // Lenis and every scroll-driven animation keep running underneath, exactly
  // as they do when the desktop band overlays the canvas.
  const [menuOpen, setMenuOpen] = useState(false)
  const burgerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    menuRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        burgerRef.current?.focus()
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (menuRef.current?.contains(target)) return
      if (burgerRef.current?.contains(target)) return
      setMenuOpen(false)
    }

    const desktop = window.matchMedia('(min-width: 901px)')
    const onDesktop = () => {
      if (desktop.matches) setMenuOpen(false)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    desktop.addEventListener('change', onDesktop)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
      desktop.removeEventListener('change', onDesktop)
    }
  }, [menuOpen])

  useEffect(() => {
    const list = listRef.current
    const track = trackRef.current
    if (!list || !track) return

    let disposed = false
    geometryRef.current = measureNavGeometry(list)

    let active = -1
    let writtenX = ''
    let writtenProgress = ''

    const apply = () => {
      const geometry = geometryRef.current
      if (!geometry) return

      const { index, x } = trackPosition(window.scrollY, geometry)

      // Two writes, both custom properties consumed by a transform, so neither
      // forces layout. Diffs keep the DOM untouched when nothing moved.
      const xValue = `${x.toFixed(2)}px`
      if (xValue !== writtenX) {
        writtenX = xValue
        track.style.setProperty('--nav-x', xValue)
      }

      const trackWidth = geometry.track[geometry.track.length - 1] || 1
      const progressValue = clamp01(x / trackWidth).toFixed(4)
      if (progressValue !== writtenProgress) {
        writtenProgress = progressValue
        track.style.setProperty('--nav-track-progress', progressValue)
      }

      if (index !== active) {
        active = index
        setActiveIndex(index)
      }
    }

    // Rebuild the model, then repaint from it in the same turn, so a refresh
    // never leaves the bead at a position computed against the old geometry.
    const remeasure = () => {
      if (disposed) return
      geometryRef.current = measureNavGeometry(list)
      apply()
    }

    // Passive: it only reads. Lenis and ScrollTrigger stay in charge of the
    // scroll itself, and this fires on every frame Lenis writes — including
    // the frames of a navbar-initiated navigation, so the bead rides along
    // with it for free.
    window.addEventListener('scroll', apply, { passive: true })

    window.addEventListener('resize', remeasure)
    // ScrollTrigger.refresh() rewrites the pin-spacer and therefore every
    // in-flow position below it; re-reading the model there is what keeps both
    // the bead and the click destinations honest after a refresh.
    ScrollTrigger.addEventListener('refresh', remeasure)
    // Web fonts change the label widths, hence b1..b4.
    if (document.fonts) {
      document.fonts.ready.then(remeasure).catch(() => undefined)
    }
    // The document also changes height without any of the events above: the 183
    // frames finish preloading and the pin-spacer is inserted, and the in-flow
    // images farther down finish loading. S3..S5 are gated on that pin being in
    // place, so without this the model would stay on its pre-pin shape — where
    // Work and Contact are still near the top — for the whole visit. Observing
    // the root element catches exactly those changes: it fires on layout, never
    // per scroll frame, and it has nothing to do with scrolling, so it adds no
    // third ScrollTrigger, no pin and no competing scroll handler.
    const rootResizeObserver = new ResizeObserver(remeasure)
    rootResizeObserver.observe(document.documentElement)

    apply()

    return () => {
      disposed = true
      window.removeEventListener('scroll', apply)
      window.removeEventListener('resize', remeasure)
      ScrollTrigger.removeEventListener('refresh', remeasure)
      rootResizeObserver.disconnect()
      track.style.removeProperty('--nav-x')
      track.style.removeProperty('--nav-track-progress')
      geometryRef.current = null
    }
  }, [])

  // CHANGE A — the top-right CTA steps away the moment the user leaves the
  // top of the page and returns when the scroll position reaches the top
  // boundary. This is a pure visibility change (opacity/visibility/
  // pointer-events): the CTA keeps its flex slot, and the nav group is an
  // absolutely-centred block, so nothing in the band moves or reflows. The
  // cadence comes from the existing ScrollTrigger progress broadcast; the
  // state read is the native scroll position Lenis already drives, so there
  // is no new scroll listener or engine.
  useEffect(() => {
    const cta = ctaRef.current
    if (!cta) return
    let hidden = false
    const update = () => {
      const next = window.scrollY > 2
      if (next === hidden) return
      hidden = next
      cta.classList.toggle('navbar__cta--hidden', next)
    }
    return subscribeScrollProgress(update)
  }, [])

  /**
   * One entry point for every navigation control in the band, so the monogram,
   * the five labels and the Let's Talk CTA can never disagree about where a
   * destination is or how it is reached.
   */
  const onNavClick = (event: MouseEvent<HTMLAnchorElement>, key: NavigationKey) => {
    // Every destination is routed through the calculated scroll position, and
    // the default is always held: the film's Home / About / Expertise
    // compositions are STATES of a pinned sequence rather than DOM positions,
    // and letting Work / Contact fall through to the native anchor jump would
    // fight Lenis, which writes the scroll on each frame of its own animation.
    event.preventDefault()

    // Re-measure now instead of trusting the cached model. This is the one
    // moment where a stale number costs something real (it would send the
    // visitor to the wrong place), it is a handful of layout reads, and it
    // happens on a click rather than on any scroll frame. The cache stays for
    // the scroll path, where it is refreshed by resize / refresh / font load.
    const geometry = measureNavGeometry(listRef.current)
    geometryRef.current = geometry

    const model = buildNavigationModel(geometry).find(
      (entry) => entry.key === key,
    )
    if (!model) return

    // Keep the fragment in the address bar — it is a real navigation target —
    // without letting the browser perform its own instant jump to it.
    window.history.replaceState(null, '', model.href)
    scrollToY(model.getTargetY())
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <a
          className="navbar__monogram ui-layer--interactive"
          href="#home"
          onClick={(event) => onNavClick(event, 'home')}
          aria-label="Sarin — home"
        >
          {/* Frame is sized to the visible mark; the PNG is scaled up inside
              it and clipped, because the file carries a wide empty margin. */}
          <span className="navbar__monogram-frame">
            <img
              src="/brand/monogram.png"
              alt=""
              width={1536}
              height={1024}
              decoding="async"
            />
          </span>
        </a>

        <nav className="navbar__nav" aria-label="Primary">
          <ul className="navbar__list" ref={listRef}>
            {NAV_ITEMS.map((item, index) => {
              const isActive = index === activeIndex
              return (
                <li key={item.key}>
                  <a
                    className={
                      isActive
                        ? 'navbar__link t-nav ui-layer--interactive is-active'
                        : 'navbar__link t-nav ui-layer--interactive'
                    }
                    href={item.href}
                    onClick={(event) => onNavClick(event, item.key)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>

          {/* ONE continuous progress track. Its base hairline is the list's own
              ::after, which already spans HOME's left edge to CONTACT's right
              edge; these two spans add only the mint fill and the single bead
              that rides its end. Decorative — the labels above already carry
              the section state accessibly — so it is hidden from assistive
              tech and takes no pointer input. */}
          <span className="navbar__track" ref={trackRef} aria-hidden="true">
            <span className="navbar__track-fill" />
            <span className="navbar__track-bead" />
          </span>
        </nav>

        <a
          ref={ctaRef}
          className="navbar__cta t-nav ui-layer--interactive"
          href="#contact"
          onClick={(event) => onNavClick(event, 'contact')}
        >
          <span>Let&rsquo;s Talk</span>
          <svg
            className="navbar__cta-arrow"
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

        {/* MOBILE — the hamburger occupies the band's right slot on narrow
            viewports. Desktop CSS hides it; the menu reveals / closes through
            one boolean so the ARIA state and the DOM can never disagree.
            Visual: the three bars fold into an X once expanded (mobile.css). */}
        <button
          ref={burgerRef}
          type="button"
          className="navbar__burger"
          aria-expanded={menuOpen}
          aria-controls="navbar-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="navbar__burger-bars" aria-hidden="true">
            <span className="navbar__burger-bar" />
            <span className="navbar__burger-bar" />
            <span className="navbar__burger-bar" />
          </span>
        </button>
      </div>

      {/* MOBILE MENU — a fixed panel beneath the band, rendered only while
          open (so its absence is also its ARIA truth). The five links reuse
          the band's own single navigation entry point: onNavClick measures,
          writes the fragment and hands the scroll destination to Lenis, and
          a valid destination closes the panel first. The active state mirrors
          activeIndex, so the panel agrees with the desktop labels about which
          segment the visitor is in. */}
      {menuOpen && (
        <div
          className="navbar__menu"
          id="navbar-menu"
          ref={menuRef}
          tabIndex={-1}
          aria-label="Site sections"
        >
          <ul className="navbar__menu-list">
            {NAV_ITEMS.map((item, index) => {
              const isActive = index === activeIndex
              return (
                <li key={item.key} className="navbar__menu-item">
                  <a
                    className={
                      isActive
                        ? 'navbar__menu-link t-nav is-active'
                        : 'navbar__menu-link t-nav'
                    }
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(event) => {
                      setMenuOpen(false)
                      onNavClick(event, item.key)
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </header>
  )
}
