/**
 * ABOUT / HOME PROGRESS MAP — single source of truth
 * --------------------------------------------------------------------------
 * Every phase in the Home->About transition is a pure function of the ONE
 * scroll source of truth: the `self.progress` (0..1) that CinematicCanvas
 * already broadcasts through progressBus. Nothing here adds a ScrollTrigger,
 * a pin, a scroll range, a timer or a rAF loop — these are just normalised
 * numbers over that same 0..1 interval, which the ScrollTrigger config in
 * CinematicCanvas (and the 183-frame asset set it drives) never sees.
 *
 * ------------------------------------------------------------------------
 * FRAME-MATH TIMING (per strict allocation 60/60/63)
 * ------------------------------------------------------------------------
 * Frame mapping: `Math.round(progress * 182)` over `ezgif-frame-(idx+1).jpg`
 * (0-based index 0..182 corresponds to filenames 1..183).
 *
 * Allocations:
 *   Home:      1–60  (0-based 0–59)  — 60 frames
 *   About:     61–120 (0-based 60–119) — 60 frames
 *   Expertise: 121–183 (0-based 120–182) — 63 frames
 *
 * Using the existing frame-sampling rule (round), the handoffs occur at
 * x = 59.5 and x = 119.5 (half-frame boundaries):
 *   Home→About:      p = 59.5 / 182 = 0.3269230769230769
 *   About→Expertise: p = 119.5 / 182 = 0.6565934065934066
 *   End:             p = 1.0 (frame 183 at x=182)
 *
 * Local progress remains derived from the same global progress. Choreography,
 * easing, overlaps, stagger order and reverse-scroll behaviour are preserved.
 */

/* --- Frame-math boundaries (align UI to 60/60/63 allocation) -- */

/** Home exit begins at first scroll movement (progress > 0). */
export const HOME_START = 0

/** All Home exits complete here; the About entry begins on this exact value. */
export const HOME_END = 59.5 / 182 // ≈ 0.3269230769
export const ABOUT_START = HOME_END

/* --- Home span ------------------------------------------------------------ */
export const HOME_SPAN = HOME_END - HOME_START

/* --- RED / YELLOW split (9/19 and 10/19 of the Home span, as audited) ----- */

export const RED_START = HOME_START
export const RED_END = HOME_START + HOME_SPAN * (9 / 19)
export const YELLOW_START = RED_END
export const YELLOW_END = HOME_END // == ABOUT_START

/* --- RED units (48 / 25 / 27 of the RED interval, contiguous) -------------
 * Unit 1 = headline + paragraph, unit 2 = both hero CTAs as one group,
 * unit 3 = trust row. Each unit finishes exactly where the next begins, so a
 * unit is fully gone before the next starts — preserved from Step 1.1. */
export const RED_W1 = RED_START
export const RED_W2 = RED_START + HOME_SPAN * (9 / 19) * 0.48
export const RED_W3 = RED_W2 + HOME_SPAN * (9 / 19) * 0.25
export const RED_W4 = RED_W3 + HOME_SPAN * (9 / 19) * 0.27 // == RED_END

/* --- About entry budget (60 frames: 61–120 filenames, 0-based 60–119) ----- */

/** About entry budget ends at the About→Expertise handoff. */
export const ABOUT_END = 119.5 / 182 // ≈ 0.6565934066

/** About span = 60 frames worth of index units. */
export const ABOUT_SPAN = ABOUT_END - ABOUT_START // ≈ 60/182 = 0.3296703297

/**
 * Map a local (0..1 within the About entry budget) window to absolute
 * progress. Local starts/ends are fractions of the budget, never seconds.
 */
export const aboutWindow = (localStart: number, localEnd: number) =>
  [ABOUT_START + ABOUT_SPAN * localStart, ABOUT_START + ABOUT_SPAN * localEnd] as const

/**
 * Staggered entrance windows. Some overlap intentionally so the reveal reads
 * as one continuous composition rather than five gates. Every block PERSISTS
 * once entered: there is no exit window for any About block. The local fractions
 * preserve the existing choreography and are applied to the new About span.
 */
export const INTRO_WINDOW = aboutWindow(0.0, 0.22)
export const PHIL_WINDOW = aboutWindow(0.14, 0.36)
export const APPROACH_WINDOW = aboutWindow(0.28, 0.5)
export const VALUES_WINDOW = aboutWindow(0.42, 0.64)
export const CLOSING_WINDOW = aboutWindow(0.56, 0.78)

/* ==========================================================================
   ABOUT PHONE PANELS (<= 767px) — three-panel horizontal track windows
   --------------------------------------------------------------------------
   On phones the five blocks group into three panels that slide across a
   shared horizontal track (see AboutPanelTrack.tsx and the "4b" block in
   responsive/mobile.css):

        Panel A            Panel B                Panel C
     Intro + Philosophy | Approach + Values | Closing

   Every window below is DERIVED from the entrance windows above — none is
   hand-picked. The resting table (times in absolute progress):

        Panel A hold      [PHIL end .. APPROACH end)  Intro + Philosophy (settled)
        A -> B slide      [PHIL end .. APPROACH end)  A exits left, B in from right
        Panel B hold      [APPROACH end .. CLOSING start)  Approach + Values
        B -> C slide      [CLOSING start .. CLOSING end)   B exits left, C in from right
        Panel C hold      [CLOSING end .. exit)   Closing

   · PANEL_AB ends exactly when Approach's reveal ends; the slide's second
     half carries Values' own remapped reveal (see the PANEL_REVEAL note in
     useAboutEntrance.ts), so both incoming members are fully revealed the
     moment the slide settles — the resting panel is never half-empty.
   · PANEL_BC shares the Closing reveal window and settles exactly at CLOSING
     end (== ABOUT_READY), so the panel handoff costs the joint About exit and
     its hold span nothing.
   · PANEL_BC shares the Closing reveal window and settles exactly at CLOSING
     end (== ABOUT_READY), so the panel handoff costs the joint About exit and
     its hold span nothing.
   ========================================================================== */

/** [T_AB_START, T_AB_END]: Panel A -> Panel B transition window. */
export const PANEL_AB = [PHIL_WINDOW[1], APPROACH_WINDOW[1]] as const

/** [T_BC_START, T_BC_END]: Panel B -> Panel C transition window. */
export const PANEL_BC = [CLOSING_WINDOW[0], CLOSING_WINDOW[1]] as const

/* ==========================================================================
   ABOUT -> EXPERTISE PHASE MAP
   --------------------------------------------------------------------------
   Same rule as everything above: these are normalised positions over the ONE
   existing `self.progress` (0..1). No new ScrollTrigger, no pin, no timer, no
   added scroll distance — the cinematic range and frame mapping are untouched.

   The remaining budget after the whole About composition is entered is split
   per the task's governing schedule. About keeps its exact allocation:

        R              = 1 - ABOUT_READY
        hold           = 0.18 R
        About exit     = 0.36 R

   The whole remainder of the pinned film after the About exit is the Expertise
   phase. It runs from EXPERTISE_START to p = 1 and is split on its OWN local
   progress (task spec), not on a hard-coded end sliver:

        local 0.00 - 0.58   Expertise entry   (left content + network reveal)
        local 0.58 - 0.74   fully drawn hold  (readable, no transition)
        local 0.74 - 1.00   sequential exit   (existing upward stagger)

   The critical handoff is exact: EXPERTISE_START === ABOUT_EXIT_END, so no
   Expertise element can appear before the last About element has left, and the
   exit ends exactly at p = 1, where the film's pin releases.
   ========================================================================== */

/** Latest completion boundary among the five About entrances. */
export const ABOUT_READY = CLOSING_WINDOW[1]

/** Progress still available once the whole About composition is on screen. */
export const REMAIN = 1 - ABOUT_READY

/** The About composition stays fully readable for this share of the budget. */
export const ABOUT_HOLD_SPAN = 0.18 * REMAIN

/** The whole About exit (five staggered left exits + rail + marker). */
export const ABOUT_EXIT_SPAN = 0.36 * REMAIN

/** About exit begins after the reading hold. */
export const ABOUT_EXIT_START = ABOUT_READY + ABOUT_HOLD_SPAN

/** About exit completes here; nothing About-related is visible past it. */
export const ABOUT_EXIT_END = ABOUT_EXIT_START + ABOUT_EXIT_SPAN

/** Expertise entrance begins on the exact About-exit completion boundary. */
export const EXPERTISE_START = ABOUT_EXIT_END

/* --- Expertise-local phase split ------------------------------------------
 * The Expertise phase is the whole pin tail [EXPERTISE_START, 1]. Its own
 * normalised progress is split into an entrance and a hold. In the previous
 * build the phase also carried an exit in its last 26%, but the exit now runs
 * in a DEDICATED post-cinematic runway (see `ExpertiseExitRunway` and
 * `expertiseExitBus`), outside the cinematic trigger and its 183-frame mapping.
 * The cinematic phase therefore only has to bring the scene IN and hold it:
 * every pixel of the phase is entrance + hold, and the exit is driven by the
 * runway's own 0..1 progress. */
export const EXPERTISE_PHASE_SPAN = 1 - EXPERTISE_START

/** Entry fills the first 58% of the Expertise phase. */
export const EXPERTISE_ENTRY_SPAN = 0.58 * EXPERTISE_PHASE_SPAN

/** Entry completes here; the scene holds fully drawn until the pin releases. */
export const EXPERTISE_END = EXPERTISE_START + EXPERTISE_ENTRY_SPAN

/**
 * Staggered About exit windows, as fractions of the About exit interval.
 * Blocks overlap deliberately (controlled stagger, not five isolated gates)
 * and the last block still completes inside the shared exit phase.
 */
const exitWindow = (offset: number, width = 0.42) =>
  [
    ABOUT_EXIT_START + ABOUT_EXIT_SPAN * offset,
    ABOUT_EXIT_START + ABOUT_EXIT_SPAN * (offset + width),
  ] as const

/* Local exit starts 0.00 / 0.10 / 0.20 / 0.30 / 0.40 per the task table;
   the 0.42 width leaves the final block ending at 0.82 of the phase. */
export const INTRO_EXIT = exitWindow(0.0)
export const PHIL_EXIT = exitWindow(0.1)
export const APPROACH_EXIT = exitWindow(0.2)
export const VALUES_EXIT = exitWindow(0.3)
export const CLOSING_EXIT = exitWindow(0.4)
