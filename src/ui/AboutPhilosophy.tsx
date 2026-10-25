import { PHIL_WINDOW } from '../aboutBeats'
import { useAboutEntrance } from './useAboutEntrance'

/**
 * ABOUT — Block 02 · Philosophy
 *
 * Enters from the RIGHT, edge of its own right-side clip lane, and persists.
 * Sits opposite the Introduction so the two read as an opposed editorial pair.
 */
export function AboutPhilosophy() {
  const contentRef = useAboutEntrance(...PHIL_WINDOW)

  return (
    <section className="about-philosophy" aria-label="Philosophy">
      <div className="about-philosophy__clip">
        <div className="about-philosophy__content" ref={contentRef}>
          <div className="about-philosophy__marker">
            <span className="about-philosophy__marker-num">02 —</span>
            <span className="about-philosophy__marker-label">PHILOSOPHY</span>
          </div>
          <h2 className="about-philosophy__headline">
            <span>
              Design with <span className="about-philosophy__highlight">purpose.</span>
            </span>
            <span>
              Build with <span className="about-philosophy__highlight">precision.</span>
            </span>
          </h2>
          <p className="about-philosophy__paragraph">
            Every decision should serve a purpose—from the first impression to
            the final interaction. I bring thoughtful design and reliable
            development together to create websites that feel considered and
            work effectively.
          </p>
          <span className="about-philosophy__divider" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
