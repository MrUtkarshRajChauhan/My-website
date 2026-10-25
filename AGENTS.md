# AGENTS.md

Guidance for OpenCode (and other AI coding) sessions in this repository.

This file has two parts:
1. **Execution Efficiency Rules** — how to work (speed, minimalism, recovery).
2. **Project-Specific Rules** — non-negotiable constraints of this codebase.

The efficiency rules **supplement** the project-specific rules; they never
override them. When the two appear to conflict, correctness and the
project-specific rules win.

---

# Execution Efficiency Rules

## 1. Concise communication
- Keep user-facing progress updates to one short sentence.
- Do not narrate internal reasoning or produce lengthy planning explanations.
- Give a concise final report covering changes, verification and blockers.

## 2. Inspect before editing
- Inspect the relevant files once before making changes.
- Identify the actual source of truth and the smallest set of files that need modification.
- Do not reread unchanged files without a concrete reason.
- Do not assume source code still matches an earlier read.

## 3. Recover from failed edits
- If an edit fails, stop and reread the current contents of the affected file.
- Identify the exact mismatch before attempting another edit.
- Never repeat an identical failed replacement.
- After two unsuccessful attempts to solve the same problem, stop and report the blocker instead of continuing a retry loop.
- Use a context-aware patch based on the current source.

## 4. Avoid unnecessary tool calls
- Do not repeatedly run the same failed shell command, search, build or edit.
- Do not rerun a successful build or test unless code changes or a specific issue justify it.
- Avoid rereading files that have not changed.
- Batch closely related, read-only inspection commands where practical.
- Do not perform speculative edits or unrelated cleanup.

## 5. Minimal implementation
- Make the smallest targeted changes needed to fulfil the user's request.
- Reuse existing components, dependencies, design tokens and architecture.
- Do not redesign, refactor, replace or delete working features unless explicitly authorized.
- Preserve existing functionality and user-defined non-negotiable constraints.
- Do not add dependencies when the existing stack can handle the task.

## 6. Verification
- Run only the build checks and tests relevant to the change.
- If a check fails, determine whether the failure was introduced by the change or already existed before it.
- Never claim a test, browser check or visual verification was performed unless it actually was.
- Clearly distinguish verified results from unverified assumptions.

## 7. Stop conditions
- After implementing the requested scope and completing the necessary checks, report the outcome and stop.
- Do not continue to unrelated tasks or make unsolicited changes.
- If an essential requirement conflicts with the existing architecture, explain the specific blocker before changing protected code.

## 8. Time efficiency without sacrificing correctness
- Prioritize reducing completion time and unnecessary tool usage.
- Prefer direct, evidence-based fixes over extended speculative analysis.
- Do not sacrifice correctness, data integrity, security or explicitly stated non-negotiable constraints merely to finish faster.

---

# Project-Specific Rules

These constraints are load-bearing. Do not alter them unless the user
explicitly authorises it. If a request conflicts with one of them, explain the
specific blocker before touching protected code.

## Technology / stack
- React + TypeScript + Vite single-page site. Animation via GSAP + ScrollTrigger;
  smooth scrolling via Lenis.
- Do **not** add dependencies when the existing stack can handle the task.
- Build/verify with `npx vite build`. Local dev server runs at
  `http://127.0.0.1:5173/?frames=public`.
- This directory is **not** a git repository.

## Scroll / cinematic architecture (protected)
- One pinned canvas drives the whole film. There must remain **exactly one
  pin-spacer** and **exactly two ScrollTriggers**: the pinning
  `CinematicCanvas` trigger and the non-pinning `ExpertiseExitRunway` trigger.
  Do not add pins, competing ScrollTriggers, or extra progress buses.
- Lenis + `progressBus` are the scroll backbone (`src/smoothScroll.ts`,
  `lenis.on('scroll', ScrollTrigger.update)`). Do not bypass or fight Lenis,
  and do not add competing scroll handlers.
- Cinematic trigger geometry is fixed: `start: 'top top'`,
  `end: () => '+=' + window.innerHeight * 6` (6 viewports). Do not change it.

## Frame allocation (protected)
- 183 frames total: 1–60 Home, 61–120 About, 121–183 Expertise.
- Frame selection is `Math.round(self.progress * 182)` clamped to `[0, 182]`.
  Do not change the frame count, mapping, or clamping.
- Do not modify canvas render/preload/decode/RAF/DPR sizing or image framing.

## Expertise exit + closing statement (protected)
- The exit is a **separate post-cinematic phase** on its own runway
  (`ExpertiseExitRunway`), not part of the cinematic 0..1 progress.
- Authoritative constants live in `src/expertiseExitBus.ts` only:
  `EXIT_SEQUENCE_END` (currently `0.82`) and `STATEMENT_REVEAL_DURATION`
  (currently `0.1`). Define each once; import it everywhere.
- Geometry: cinematic end `6vh`; runway block `4.08vh`; Work top `11.08vh`;
  exit trigger still spans `[6vh, 11vh]`; `p_e = clamp01(progress * 5/4)`.
  Do not move the trigger endpoints to create reading distance — extend the
  runway's normal-flow length instead (`.expertise-exit-runway { height }`).
- The five exit stages and their normalized intervals, stagger, easing and
  reverse behaviour are fixed.
- The statement ("Enough talk. / See the work.") is a fixed overlay driven by
  `p_e`; it must reverse cleanly and must not flicker or reset.
- The frozen canvas must not be released before Work covers the composition.

## Assets, design tokens, protected components
- Reuse existing assets and fonts (Playfair Display, ClashDisplay) already in
  the repo. Do not swap the type system or import new fonts.
- Use design tokens from `src/styles/variables.css`. Do not hard-code new
  colours, z-indexes, or spacing values that duplicate existing tokens.
- Treat these as protected unless explicitly asked to change them:
  `src/CinematicCanvas.tsx`, `src/ui/SceneDirector.tsx`, `src/ui/Navbar.tsx`,
  `src/ui/Work.tsx`, `src/ui/UIOverlay.tsx`, `src/smoothScroll.ts`,
  `src/styles/variables.css`, and the documented z-index layer order.
- Do not remove intentional UI: the nav active indicator/baseline hairline,
  metadata label dividers, card/button/panel borders, or the vertical scroll
  cue.

## Change discipline
- Preserve the existing code style, structure, naming and the extensive
  explanatory comments.
- Prefer the smallest targeted edit over rewriting a file.
- Do not delete or refactor working features as a side effect of an unrelated
  request.
