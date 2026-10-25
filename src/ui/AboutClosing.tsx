import { CLOSING_WINDOW } from '../aboutBeats'
import { useAboutEntrance } from './useAboutEntrance'

/**
 * ABOUT — Block 05 · Closing
 *
 * Last of the five persistent blocks. Enters from the RIGHT, edge of its own
 * right-side clip lane, and then stays — completing the About composition.
 * No fabricated claims, results or testimonials.
 */
export function AboutClosing() {
  const contentRef = useAboutEntrance(...CLOSING_WINDOW)

  return (
    <section className="about-closing" aria-label="Closing">
      <div className="about-closing__clip">
        <div className="about-closing__content" ref={contentRef}>
          <div className="about-closing__marker">
            <span className="about-closing__marker-num">05 —</span>
            <span className="about-closing__marker-label">CLOSING</span>
          </div>
          <div className="about-closing__text">
            <h2 className="about-closing__headline">
              <span>Let&rsquo;s build something</span>
              <span>
                that moves your{' '}
                <span className="about-closing__highlight">business forward.</span>
              </span>
            </h2>
            <p className="about-closing__paragraph">
              Have a business to grow or an idea worth building?
              <br />
              Let&rsquo;s discuss what your website needs to achieve.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
