import { APPROACH_WINDOW } from '../aboutBeats'
import { useAboutEntrance } from './useAboutEntrance'

/**
 * ABOUT — Block 03 · My Approach
 *
 * Enters from the RIGHT, edge of its own left-side clip lane, and persists.
 * Holds a compact editorial process list (not four cards): a subtle vertical
 * connector line with restrained circular markers.
 */
export function AboutApproach() {
  const contentRef = useAboutEntrance(...APPROACH_WINDOW)

  return (
    <section className="about-approach" aria-label="My Approach">
      <div className="about-approach__clip">
        <div className="about-approach__content" ref={contentRef}>
          <div className="about-approach__marker">
            <span className="about-approach__marker-num">03 —</span>
            <span className="about-approach__marker-label">MY APPROACH</span>
          </div>
          <h2 className="about-approach__headline">
            <span>Understand.</span>
            <span>Design. Develop.</span>
            <span className="about-approach__highlight">Refine.</span>
          </h2>
          <ol className="about-approach__steps">
            <li className="about-approach__step">
              <span className="about-approach__node" aria-hidden="true" />
              <span className="about-approach__step-num">01 —</span>
              <div className="about-approach__step-body">
                <h3 className="about-approach__step-title">Understand</h3>
                <p className="about-approach__step-text">
                  Learn about the business, its audience, and its goals.
                </p>
              </div>
            </li>
            <li className="about-approach__step">
              <span className="about-approach__node" aria-hidden="true" />
              <span className="about-approach__step-num">02 —</span>
              <div className="about-approach__step-body">
                <h3 className="about-approach__step-title">Design</h3>
                <p className="about-approach__step-text">
                  Create a clear visual direction and intuitive user experience.
                </p>
              </div>
            </li>
            <li className="about-approach__step">
              <span className="about-approach__node" aria-hidden="true" />
              <span className="about-approach__step-num">03 —</span>
              <div className="about-approach__step-body">
                <h3 className="about-approach__step-title">Develop</h3>
                <p className="about-approach__step-text">
                  Build a responsive, performant website.
                </p>
              </div>
            </li>
            <li className="about-approach__step">
              <span className="about-approach__node" aria-hidden="true" />
              <span className="about-approach__step-num">04 —</span>
              <div className="about-approach__step-body">
                <h3 className="about-approach__step-title">Refine</h3>
                <p className="about-approach__step-text">
                  Test the details and improve the experience before delivery.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}
