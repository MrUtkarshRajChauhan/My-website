/**
 * LENIS HANDLE — a read-only reference to the ONE existing smoothing instance.
 *
 * `initSmoothScroll()` creates the site's only Lenis instance and returns it,
 * but `main.tsx` has no consumer for that return value, so nothing else could
 * reach it. Programmatic navigation (the navbar) has to hand its destination
 * to that same instance rather than start a second scroll engine or a GSAP
 * tween over `window.scrollY`, so the handle is parked here.
 *
 * Deliberately NOT a bus:
 *   - no listeners, no emission, no subscription, no replay;
 *   - it never writes the scroll position, it only hands out the reference to
 *     the component that already owns it;
 *   - `smoothScroll.ts` itself is untouched — the wiring lives in `main.tsx`,
 *     which calls `initSmoothScroll()` and simply keeps what it gets back.
 *
 * One value in, one value out.
 */
import type Lenis from 'lenis'

let instance: Lenis | null = null

/** Called once from main.tsx, before the first render. */
export function setLenis(lenis: Lenis | null): void {
  instance = lenis
}

/**
 * The live instance, or `null` when there is none — which is the reduced-motion
 * path, where `initSmoothScroll()` deliberately bails out. Callers must treat
 * `null` as "nothing smooths the scroll", not as an error.
 */
export function getLenis(): Lenis | null {
  return instance
}
