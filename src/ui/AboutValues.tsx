import { VALUES_WINDOW } from '../aboutBeats'
import { useAboutEntrance } from './useAboutEntrance'

/**
 * ABOUT — Block 04 · What I Value
 *
 * Enters from the RIGHT, edge of its own right-side clip lane, and persists.
 */
export function AboutValues() {
  const contentRef = useAboutEntrance(...VALUES_WINDOW)

  return (
    <section className="about-values" aria-label="What I Value">
      <div className="about-values__clip">
        <div className="about-values__content" ref={contentRef}>
          <div className="about-values__marker">
            <span className="about-values__marker-num">04 —</span>
            <span className="about-values__marker-label">WHAT I VALUE</span>
          </div>
          <h2 className="about-values__headline">
            The <span className="about-values__highlight">details</span> make the
            difference.
          </h2>
          <p className="about-values__paragraph">
            Clarity over clutter. Function over decoration. Performance without
            compromise. Every detail should contribute to a better experience
            for the people using the website.
          </p>
          <span className="about-values__divider" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
