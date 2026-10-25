import { useEffect, useRef } from 'react'
import { CinematicCanvas } from './CinematicCanvas'
import { Navbar } from './ui/Navbar'
import { Hero } from './ui/Hero'
import { AboutIntro } from './ui/AboutIntro'
import { AboutPhilosophy } from './ui/AboutPhilosophy'
import { AboutApproach } from './ui/AboutApproach'
import { AboutValues } from './ui/AboutValues'
import { AboutClosing } from './ui/AboutClosing'
import { AboutChrome } from './ui/AboutChrome'
import { AboutPanelTrack } from './ui/AboutPanelTrack'
import { Expertise } from './ui/Expertise'
import { ExpertiseExit } from './ui/ExpertiseExit'
import { ExpertiseExitRunway } from './ui/ExpertiseExitRunway'
import { SceneDirector } from './ui/SceneDirector'
import { Work } from './ui/Work'
import { WorkTestimonials } from './ui/WorkTestimonials'
import { Contact } from './ui/Contact'
import { UIOverlay } from './ui/UIOverlay'

/**
 * Application shell.
 *
 * Returns a Fragment, not a wrapper element, on purpose. The canvas is the
 * ScrollTrigger trigger and the pinned element, so it has to stay a direct
 * child of the React root. Any positioned or sized element between here and
 * <CinematicCanvas /> would relocate the pin-spacer ScrollTrigger creates
 * around the canvas and change the measured pin geometry.
 *
 * Layer order, bottom to top:
 *   1. <CinematicCanvas />  — the frame engine (position owned by its pin)
 *   2. <ExpertiseExitRunway /> — the DEDICATED post-cinematic exit runway: one
 *                             empty block of exactly four viewport heights in
 *                             normal flow. It paints nothing (the held final
 *                             frame sits over it) — it only supplies the scroll
 *                             distance that the separate Expertise exit phase
 *                             scrubs across, so the cinematic's own pin geometry
 *                             and 183-frame mapping stay untouched.
 *   3. <Work />             — the first NORMAL-FLOW content. It lands after the
 *                             pin-spacer ScrollTrigger wraps around the canvas
 *                             AND after the exit runway, i.e. at 11.48 viewport
 *                             heights — one statement exit after the reading hold,
 *                             so its first pixel reaches the fold exactly as the
 *                             closing statement finishes leaving. It is not fixed and
 *                             does not touch the
 *                             film's scroll distance. Ordered before <UIOverlay>
 *                             so the fixed navbar, which shares --z-content/--z-ui
 *                             and comes later in document order, still paints
 *                             above it.
 *   3. <WorkTestimonials />  — the SECOND normal-flow content: the Client
 *                             Perspective testimonial chapter. A plain sibling
 *                             of <Work /> in the same --z-content band, so it
 *                             scrolls over the same ONE stationary
 *                             `.static-background` layer with no second
 *                             background, no second pin and no added scroll
 *                             distance. Its own non-pinning ScrollTrigger
 *                             carries the shared Work 01 exit / Work 02
 *                             entrance boundary (see WorkTestimonials.tsx).
 *   3. <Contact />          — the THIRD and final normal-flow content: the
 *                             closing Contact section (portrait, personal note,
 *                             business-email panel, social panel). Also a plain
 *                             sibling in the same --z-content band over the same
 *                             ONE stationary `.static-background`, with one
 *                             non-pinning, scrubbed ScrollTrigger for its whole
 *                             entrance and no added scroll distance. Because it
 *                             is the last in-flow section, its own id="contact"
 *                             is the anchor the fixed navbar already tracks, so
 *                             no navbar change was needed.
 *   4. .cinematic-overlay   — the existing fixed dark cinematic treatment
 *   5. <UIOverlay>          — the portfolio UI: navbar, Home (hero), the five
 *                             About blocks, the About chrome (marker + rail)
 *                             and the Expertise scene (with SceneDirector,
 *                             which drives the About exit from shared progress)
 *
 * Layer 0 is the body background declared by the design tokens.
 *
 * The hero (inside the fixed UI layer) stays glued to the viewport for the
 * whole document. The wrapper below scopes the hero fade to composition —
 * Hero itself is untouched. The #work section now exists, so that fade arms
 * itself exactly when the Work section reaches the fold — which, with the exit
 * runway in place, is the moment the separate Expertise exit completes.
 */
export function App() {
  const heroScopeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scope = heroScopeRef.current
    const section = document.getElementById('work')
    if (!scope || !section) return

    let hidden = false
    const update = () => {
      // Hide the fixed hero once the post-film Work section enters the
      // viewport, and show it again as soon as scrolling back brings the film
      // on screen. Work sits after the pinned film AND after the exit runway, so
      // this fires exactly when the Expertise exit completes — the whole scene
      // stays visible (and scrubbable) for the exit, then disappears the instant
      // Work reaches the fold.
      //
      // ARM ONLY ONCE THE FILM'S PIN EXISTS. On a fresh load the document is
      // still in its transient, pre-pin state: CinematicCanvas only creates its
      // ScrollTrigger after all 183 frames finish preloading, so until then the
      // canvas is an un-pinned element and #work sits only the exit runway below
      // it — near the fold — even though in the settled layout it is ~11
      // viewports down. Reading its rect then would dismiss Home before the user
      // has scrolled (and nothing re-ran update() when the pin later appeared, so
      // it stayed hidden until the first scroll). The .pin-spacer is the same
      // ScrollTrigger wrapper CinematicCanvas already reconciles against, so
      // its presence is the exact "document is settled" signal.
      const settled = !!document.querySelector('.pin-spacer')
      const next =
        settled && section.getBoundingClientRect().top <= window.innerHeight
      if (next !== hidden) {
        hidden = next
        scope.classList.toggle('hero-scope--hidden', hidden)
      }
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    // Re-evaluate whenever the document's layout settles — the pin-spacer is
    // inserted asynchronously when the frames finish preloading, and that is
    // the moment the settled layout first exists. No timer, no polling.
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(document.documentElement)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <>
      <CinematicCanvas />
      <ExpertiseExitRunway />
      <Work />
      <WorkTestimonials />
      <Contact />
      <div className="cinematic-overlay" aria-hidden="true" />
      <UIOverlay>
        <Navbar />
        <div className="hero-scope" ref={heroScopeRef}>
          <Hero />
          {/* The About composition container. On desktop the five sections
              are all absolutely positioned against the UI layer, so this
              wrapper is a zero-height box and the composition is untouched.
              Under 768px it becomes the three-panel phone TRACK (mobile.css):
              a grid of three viewport-wide panels — Intro+Philosophy /
              Approach+Values / Closing — laid out edge to edge and bottom
              anchored, which AboutPanelTrack translates horizontally from the
              shared progress. The track's inline `translate` is written only
              in the phone band, so nothing here touches the desktop. */}
          <div className="about-stage">
            <div className="about-left-lane">
              <AboutIntro />
              <AboutApproach />
            </div>
            <AboutPhilosophy />
            <AboutValues />
            <AboutClosing />
          </div>
          <ExpertiseExit>
            <AboutChrome />
            <Expertise />
          </ExpertiseExit>
          <SceneDirector />
          {/* The phone-band three-panel track driver (<= 767px only). It is
              placed after SceneDirector so it can never race it for the same
              element set: this component only writes the CSS `translate` of
              .about-stage and subscribes to the same shared progress bus. */}
          <AboutPanelTrack />
        </div>
      </UIOverlay>
    </>
  )
}