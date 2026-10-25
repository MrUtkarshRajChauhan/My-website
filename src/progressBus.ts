/**
 * Shared scroll-progress bus.
 *
 * CinematicCanvas owns the only ScrollTrigger on the page and its onUpdate
 * already computes the single source of truth: `self.progress` (0..1 over the
 * 600vh pin). This module simply re-broadcasts that value to the fixed UI
 * layer (navbar CTA state, hero red-group exits).
 *
 * Deliberately tiny and passive:
 *   - The emit is one line inside the existing onUpdate callback; the frame
 *     selection and rendering code are untouched.
 *   - Subscribers receive the last known progress immediately on subscribe,
 *     so a component mounting after a scroll is still in the right state.
 *   - No new scroll engine, no competing ScrollTrigger, no DOM work here.
 */
type ProgressListener = (progress: number) => void

const listeners = new Set<ProgressListener>()
let lastProgress = 0

export function emitScrollProgress(progress: number): void {
  lastProgress = progress
  listeners.forEach((listener) => listener(progress))
}

export function subscribeScrollProgress(listener: ProgressListener): () => void {
  listeners.add(listener)
  listener(lastProgress)
  return () => {
    listeners.delete(listener)
  }
}