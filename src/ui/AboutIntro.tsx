import { INTRO_WINDOW } from '../aboutBeats'
import { useAboutEntrance } from './useAboutEntrance'

/**
 * ABOUT — Block 01 · Introduction
 *
 * First of five persistent About blocks. Lives in the fixed UI layer (out of
 * document flow, so the ~600vh pin distance is untouched) and is driven by the
 * shared scroll progress through the single `useAboutEntrance` mechanism.
 *
 * It enters from the RIGHT, edge of its own left-side clip lane, and then
 * STAYS — no later block ever removes it. (Supersedes the earlier Step 3 model
 * where the Introduction exited left as Philosophy entered.)
 */
export function AboutIntro() {
  const contentRef = useAboutEntrance(...INTRO_WINDOW)

  return (
    <section className="about-intro" aria-label="Introduction">
      <div className="about-intro__clip">
        <div className="about-intro__content" ref={contentRef}>
          <div className="about-intro__marker">
            <span className="about-intro__marker-num">01 —</span>
            <span className="about-intro__marker-label">INTRODUCTION</span>
          </div>
          <h2 className="about-intro__headline">
            <span>More than just</span>
            <span className="about-intro__highlight">a good-looking</span>
            <span className="about-intro__highlight">website.</span>
          </h2>
          <p className="about-intro__paragraph">
            I design and develop digital experiences that help businesses
            communicate clearly, earn trust, and turn visitors into customers.
          </p>
          <span className="about-intro__divider" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
