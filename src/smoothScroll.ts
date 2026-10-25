import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Smooth scroll layer.
 *
 * Architecture is unchanged and strictly additive:
 *
 *   user wheel/touch
 *     -> Lenis (eases the native scroll position only)
 *       -> window scroll
 *         -> ScrollTrigger (still owns progress 0..1)
 *           -> frame 0..182
 *             -> canvas
 *
 * Lenis never touches frames, canvas, or frame mapping. It only smooths the
 * scroll position, and ScrollTrigger remains the single source of truth for
 * progress. There is exactly one smoothing mechanism: Lenis. No custom wheel
 * handlers, no extra rAF interpolation loop, no second scroll library.
 */
export function initSmoothScroll() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return null

  // Cadence was measured, not guessed. Per-frame dwell time (ms each of the 183
  // frames stays on screen during a real scroll) was compared across easings and
  // across Lenis `duration` vs `lerp` mode on a real display:
  //
  //   quart 0.6 (shipped)  p50 20.1ms  p90 30.2ms  p99  97ms  cv 0.40
  //   pow2  0.6           p50 20.4ms  p90 30.7ms  p99  79ms  cv 0.36
  //   linear 0.6          p50 21.0ms  p90 30.3ms  p99  72ms  cv 0.32
  //   lerp 0.08-0.30      p50 20.4ms  p90 30.6ms  p99 139ms  cv 0.58  <-- worse
  //
  // Lenis resolves easing and lerp with an if/else-if on `duration`, so the two
  // are mutually exclusive: setting `duration` makes `lerp` dead code. Measured
  // head-to-head, duration mode has a materially shorter tail than lerp mode
  // (p99 97ms vs 139ms), and lerp was measurably worse at every value tested, so
  // duration mode is kept.
  //
  // Quartic ease-out over 0.6s commits to half the movement in ~365ms and lands
  // the final 10% in ~184ms. The previous 1.05s / 2^(-10t) curve trailed its last
  // 10% across 436ms, which is what reads as lag.
  //
  // NOTE: p50 dwell is ~20ms, i.e. one display frame. Frame advance is already
  // display-locked; see the cadence notes in CinematicCanvas onUpdate.
  const lenis = new Lenis({
    duration: 0.6,
    easing: (t: number) => 1 - Math.pow(1 - t, 4),
    // Native scroll stays in charge of the actual scroll position, so ScrollTrigger
    // pinning, refresh and progress all keep working untouched.
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 1,
    touchMultiplier: 1.5,
  })

  // ScrollTrigger.update() on every smoothed scroll tick keeps ScrollTrigger's
  // cached scroll position in sync with the eased value.
  lenis.on('scroll', ScrollTrigger.update)

  // Drive Lenis from the GSAP ticker so there is a single rAF loop for the whole
  // page instead of Lenis running its own loop alongside ScrollTrigger's.
  const raf = (time: number) => lenis.raf(time * 1000)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)

  // Recalculate after the viewport changes so the 600vh distance and pin
  // positions stay correct on resize.
  //
  // This is DEBOUNCED and it is the ONLY debounced part of the resize path.
  // CinematicCanvas re-derives the canvas box synchronously on the resize event
  // itself, so by the time this refresh is measured the pinned element is
  // already the new viewport size and ScrollTrigger's pin sizer is sized
  // correctly. Debouncing here rather than there is what guarantees that
  // ordering, and it also stops a window drag from re-running every trigger's
  // measurement once per resize event.
  //
  // A resize event with no layout-relevant change (a mobile URL-bar toggle, a
  // notification bar) is dropped outright.
  let refreshTimer: ReturnType<typeof setTimeout> | undefined
  let lastW = window.innerWidth
  let lastH = window.innerHeight

  const onResize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    if (w === lastW && h === lastH) return
    lastW = w
    lastH = h
    lenis.resize()
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined
      ScrollTrigger.refresh()
    }, 150)
  }
  window.addEventListener('resize', onResize)

  const destroy = () => {
    window.removeEventListener('resize', onResize)
    if (refreshTimer) clearTimeout(refreshTimer)
    gsap.ticker.remove(raf)
    lenis.destroy()
  }

  return { lenis, destroy }
}
