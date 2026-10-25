/**
 * EXPERTISE EXIT BUS — progress for the dedicated post-cinematic exit runway.
 *
 * The Expertise exit is NO LONGER part of the cinematic 0..1 progress. It runs
 * in its own scroll phase after the film's pin has ended (see
 * `ExpertiseExitRunway`), so it needs its own progress channel.
 *
 * This is deliberately SEPARATE from `progressBus`:
 *
 *   • `progressBus` carries the cinematic progress that selects the 183-frame
 *     sequence and drives every earlier scene. During the runway that signal
 *     must stay pinned at exactly 1 — feeding the exit into it would corrupt
 *     the frame mapping and re-trigger the incoming choreography.
 *   • this bus carries ONLY the runway-local progress `p_e ∈ [0, 1]`, where
 *     0 is the instant the pin releases and 1 is the instant the exit is
 *     complete. It is a pure function of scroll position (emitted from the
 *     runway ScrollTrigger's `onUpdate`), never of elapsed time, so it scrubs
 *     both forwards and backwards.
 *
 * One value in, one value out. Subscribers receive the last value immediately
 * on subscribe, so every beat is placed correctly on mount and on the first
 * frame after a refresh — the same replay contract as `progressBus`.
 */
/**
 * EXIT SEQUENCE BOUNDARY — one value, shared by the exit choreography and the
 * closing statement.
 *
 * The five-stage bottom-to-top exit choreography is compressed into the FIRST
 * 82% of `p_e`, so it plays ~9.8% faster (0.90 / 0.82 = 1.098) and finishes
 * exactly where the static-background crossfade begins. The runway's scroll
 * distance and the `p_e` range are untouched - only the choreography's own
 * mapping is rescaled.
 */
export const EXIT_SEQUENCE_END = 0.82

/**
 * BACKGROUND CROSSFADE - the final cinematic frame (filename 183, held frozen
 * on the canvas) crossfades into the static Work background over this slice of
 * `p_e`. It opens exactly where the exit sequence ends and reaches full opacity
 * at BACKGROUND_FADE_END; the blend itself is a smoothstep, so both ends are
 * soft and the hand-off never pops.
 *
 * `p_e` runs 0 -> 1 over the 4-viewport runway:
 *   - [0.00, EXIT_SEQUENCE_END]                     the Expertise exit sequence
 *   - [EXIT_SEQUENCE_END, BACKGROUND_FADE_END]      the static-background crossfade
 *   - [BACKGROUND_FADE_END, STATEMENT_REVEAL_END]   the "Enough / talk. / See the work!" reveal
 *   - [STATEMENT_REVEAL_END, STATEMENT_EXIT_START]  the reading hold (headline fully visible)
 *   - [STATEMENT_EXIT_START, STATEMENT_EXIT_END]    the headline's own exit
 */
export const BACKGROUND_FADE_END = 0.88

/**
 * STATEMENT REVEAL - the headline's own slice of `p_e`, opened immediately
 * after the background has finished fading in. The three scroll beats split
 * this window into equal thirds (Enough / talk. / See the work!).
 */
export const STATEMENT_REVEAL_START = BACKGROUND_FADE_END
export const STATEMENT_REVEAL_END = 0.97

/**
 * STATEMENT EXIT - the tail of the headline's window, expressed in the SAME
 * units as `p_e` but deliberately PAST its saturation at 1.
 *
 * `p_e` is clamped (`p_e = clamp01(progress * 5/4)`), so it stops resolving at
 * 10 viewport heights while the runway trigger itself keeps running to 11. The
 * headline is scrubbed by the UNCLAMPED runway value, so it can hold through
 * the reading pause (where `p_e` is pinned at 1) and then leave the screen
 * WITHOUT a second trigger, a second bus or a timer.
 *
 * `STATEMENT_EXIT_START` sits exactly one reading hold (0.40 vh) after the
 * reveal completes; `STATEMENT_EXIT_END` lands exactly where Work's first pixel
 * reaches the fold, so the headline always reaches its fully-hidden state a
 * pixel before any Work content can become visible. The runway's normal-flow
 * length supplies the extra scroll distance (never the trigger endpoints).
 */
export const STATEMENT_EXIT_START = 1.07
export const STATEMENT_EXIT_END = 1.12

type ExitListener = (progress: number) => void

const listeners = new Set<ExitListener>()
let lastExitProgress = 0

/** Publish the runway-local exit progress. Called from the runway trigger. */
export function emitExpertiseExitProgress(progress: number): void {
  lastExitProgress = progress
  listeners.forEach((listener) => listener(progress))
}

/** Subscribe to the runway-local exit progress. Returns an unsubscribe fn. */
export function subscribeExpertiseExitProgress(
  listener: ExitListener,
): () => void {
  listeners.add(listener)
  // Replay the current value so a late subscriber is never left un-placed.
  listener(lastExitProgress)
  return () => {
    listeners.delete(listener)
  }
}
