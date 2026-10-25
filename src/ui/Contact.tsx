import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_CONFIGURED,
  PORTRAIT_SRC,
  SOCIAL_PROFILES,
  buildGmailComposeUrl,
  buildMailtoHref,
  type SocialId,
} from '../contactInfo'

gsap.registerPlugin(ScrollTrigger)

/**
 * CONTACT — the final normal-flow section.
 *
 * WHERE IT SITS
 * A plain sibling of <Work /> and <WorkTestimonials /> in App: the same
 * normal-flow position, the same `--z-content` band and the same bare,
 * transparent box. It therefore scrolls over the ONE persistent fixed
 * background (`.static-background`, mounted and crossfaded in by
 * <ExpertiseExitRunway />) exactly as Work does, with no second background
 * layer, no second pin and nothing added to the cinematic scroll distance.
 *
 * The section is NOT another pinned cinematic scene. It is the natural
 * continuation of the vertically scrolling portfolio.
 *
 * NAVBAR — nothing to wire. The existing navbar already resolves a `#contact`
 * section through the same `flowSection()` interval formula it uses for Work,
 * so declaring `id="contact"` is the whole integration: the CONTACT label
 * becomes active and its scroll-progress indicator starts tracking this box.
 * No navbar change was needed or made.
 *
 * THE ENTRANCE — exactly one non-pinning, scrubbed ScrollTrigger for the whole
 * composition (never one per component). Its timeline's `progress()` IS the
 * entrance progress `q ∈ [0,1]`, normalised by a zero-length dummy tween so
 * each group's interval is literally a fraction of the scroll window and the
 * groups overlap into one coordinated rise rather than five sequential waits.
 * `scrub: true` makes it reverse naturally on the way back up, and because the
 * progress is derived purely from the measured box it lands correctly however
 * far down the page the document is refreshed.
 *
 * It is deliberately NOT routed through `progressBus` (cinematic frames) or
 * `expertiseExitBus` (the post-film runway): it adds no bus, no pin, no timer
 * and no extra rAF loop, exactly like the existing Work entrance.
 *
 * MISSING INFORMATION
 * The project contains NO verified email, NO verified profile URLs and no
 * developer portrait. Nothing is fabricated here: see `src/contactInfo.ts`,
 * the single configuration point. Every dependent control renders disabled or
 * non-interactive rather than pointing at an invented destination.
 */

/* ==========================================================================
   BRAND MARKS
   --------------------------------------------------------------------------
   No social-brand asset or icon package ships with this project (`public/
   brand/` holds only the monogram, the signature and a set of technology
   logos), and the project's own convention — see `CtaArrow` in Work.tsx — is a
   hand-rolled inline SVG rather than an added dependency. The six marks below
   are the official Simple Icons (`simple-icons`, CC0-1.0) path data for each
   platform, used verbatim: a real, recognisable logo is never approximated
   with an unrelated glyph.

   COLOUR — each mark carries its OWN official treatment instead of inheriting
   the site palette, for the same reason no technology logo is ever tinted
   mint. LinkedIn and Facebook paint their solid brand blue (their path data is
   the whole tile, so one flat fill yields the official white glyph reversed out
   of it), Instagram paints its camera glyph with the brand gradient, Reddit
   paints its Snoo disc in the brand orange, and GitHub and X stay the approved
   monochrome marks in the panel's warm ivory.
   ========================================================================== */
const SOCIAL_PATHS: Record<SocialId, string> = {
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  instagram:
    'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  facebook:
    'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  reddit:
    'M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z',
}

/** Stable id for the one Instagram gradient, painted inside its own glyph. */
const INSTAGRAM_GRADIENT_ID = 'contact-social-instagram-gradient'

/**
 * The official Instagram gradient — the yellow/orange → magenta → violet ramp
 * of the brand's camera glyph, read along the bottom-left → top-right diagonal
 * the mark itself uses. It is painted by the same glyph that owns it, so
 * there is no <img> request, no new asset and no added dependency, and it is
 * never replaced by the site's mint accent.
 */
function InstagramGradient() {
  return (
    <defs>
      <linearGradient id={INSTAGRAM_GRADIENT_ID} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#feda75" />
        <stop offset="26%" stopColor="#fa7e1e" />
        <stop offset="52%" stopColor="#d62976" />
        <stop offset="76%" stopColor="#962fbf" />
        <stop offset="100%" stopColor="#4f5bd5" />
      </linearGradient>
    </defs>
  )
}

/**
 * The official brand treatment of each mark.
 *
 * `currentColor` is the fill of the two monochrome marks — GitHub and X — so
 * they inherit the row's warm ivory. The others name their fill outright: two
 * solid brand blues (their path data is the whole tile, so one flat fill
 * yields the official white glyph reversed out of it), the Instagram
 * gradient, and Reddit's official orange on its Snoo disc. Keeping the fill on
 * the <path> is also what stops hover from ever tinting an official logo with
 * the site accent: nothing here is derived from `color`.
 */
const SOCIAL_BRAND_FILL: Record<SocialId, string> = {
  linkedin: '#0a66c2',
  instagram: `url(#${INSTAGRAM_GRADIENT_ID})`,
  github: 'currentColor',
  facebook: '#1877f2',
  x: 'currentColor',
  reddit: '#FF4500',
}

/** One platform mark, painted in its own official brand treatment. */
function SocialGlyph({ id }: { id: SocialId }) {
  return (
    <svg
      className="contact__social-logo-svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {id === 'instagram' ? <InstagramGradient /> : null}
      <path d={SOCIAL_PATHS[id]} fill={SOCIAL_BRAND_FILL[id]} />
    </svg>
  )
}

/** The two overlapping frames of the copy-to-clipboard control. */
function CopyIcon() {
  return (
    <svg
      className="contact__icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="8.75"
        y="8.75"
        width="12"
        height="12"
        rx="2.25"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M15.25 5.75h-9.5a2 2 0 0 0-2 2v9.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** The confirmed state of the copy control. */
function CheckIcon() {
  return (
    <svg
      className="contact__icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="m5 12.75 4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  )
}

/** The right arrow on WRITE ME AN EMAIL. */
function ArrowRight() {
  return (
    <svg
      className="contact__action-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  )
}

/** The external-link arrow on OPEN IN GMAIL. */
function ArrowExternal() {
  return (
    <svg
      className="contact__action-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 16 16 8M9.75 8H16v6.25"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  )
}

/** The result of the last copy attempt, for the visible + live feedback text. */
type CopyState = 'idle' | 'ok' | 'error'

export function Contact() {
  const sectionRef = useRef<HTMLElement>(null)
  const portraitRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLDivElement>(null)
  const socialRef = useRef<HTMLElement>(null)
  const noteRef = useRef<HTMLElement>(null)

  const [copyState, setCopyState] = useState<CopyState>('idle')

  // Reset the copy feedback a moment after it appears. Cleared on unmount so a
  // teardown can never leave a timer writing into a dead component. This is a
  // UI feedback timer only — it is not a scroll mechanism, a bus or a rAF loop.
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(copyTimer.current), [])

  const handleCopy = async () => {
    if (!CONTACT_EMAIL_CONFIGURED) return
    clearTimeout(copyTimer.current)
    // Start every attempt from a neutral state so a previous result can never
    // linger as a stale claim while the new write is still in flight.
    setCopyState('idle')
    try {
      // Clipboard API only. No dependency, and no success state is shown
      // unless the write actually resolved.
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable')
      }
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopyState('ok')
    } catch {
      // Graceful failure: the address stays on screen and selectable, and the
      // visitor is told what to do instead of being left with a silent no-op.
      setCopyState('error')
    }
    copyTimer.current = setTimeout(() => setCopyState('idle'), 2400)
  }

  // ONE shared entrance timeline. Scrubbed, non-pinning: the section stays in
  // normal document flow and the timeline's progress is driven purely by the
  // scroll position, so the entrance reverses cleanly and re-derives itself
  // wherever the page is refreshed.
  //
  // Created only once the cinematic `.pin-spacer` exists — the same
  // settled-document contract Work.tsx and WorkTestimonials.tsx use. Before
  // that the document is in its much shorter pre-pin layout, so measuring the
  // interval early would compute it several viewports wrong. No timer and no
  // polling: a MutationObserver fires the moment the settled document exists.
  useLayoutEffect(() => {
    const section = sectionRef.current
    const portrait = portraitRef.current
    const intro = introRef.current
    const email = emailRef.current
    const social = socialRef.current
    const note = noteRef.current
    if (!section || !portrait || !intro || !email || !social || !note) return

    // Reduced motion: no travel and no fade. Every group simply rests in place,
    // fully visible, and the reading order is untouched.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let context: ReturnType<typeof gsap.context> | null = null
    let observer: MutationObserver | null = null

    const create = () => {
      if (context) return
      if (!document.querySelector('.pin-spacer')) return

      context = gsap.context(() => {
        const entrance = gsap.timeline({
          defaults: { ease: 'none' },
          // `scrub` links the timeline's progress to the scroll position over
          // [top 90%, top 30%] — a 0.6-viewport window that is comfortably
          // inside this section's own travel, so the composition has settled
          // well before the visitor reaches the bottom of the page.
          scrollTrigger: {
            trigger: section,
            start: 'top 90%',
            end: 'top 30%',
            scrub: true,
            invalidateOnRefresh: true,
          },
        })

        // Normalise the timeline length to exactly 1 so `progress()` IS the
        // entrance progress q, and each interval below is literally a fraction
        // of the scroll window. Without it the longest tween (0.84) would
        // silently rescale every interval by 1/0.84.
        entrance.to({}, { duration: 1 }, 0)

        // The five overlapping intervals from the approved direction. Each
        // group rises to its natural resting position (y: 0) and no further —
        // the section is in normal flow, so this is a short relative reveal on
        // top of that, never a second movement system.
        entrance.fromTo(
          portrait,
          { y: 36, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.55 },
          0.0,
        )
        entrance.fromTo(
          intro,
          { y: 28, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5 },
          0.12,
        )
        entrance.fromTo(
          email,
          { y: 36, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.54 },
          0.22,
        )
        entrance.fromTo(
          social,
          { y: 32, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.54 },
          0.3,
        )
        entrance.fromTo(
          note,
          { y: 14, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.45 },
          0.35,
        )

        // Measure NOW. This trigger is deliberately created only once the
        // cinematic's `.pin-spacer` exists, which happens asynchronously when
        // the 183 frames are ready — i.e. AFTER the page's own initial
        // measurement pass has already run, and nothing schedules another one
        // until the next resize. A ScrollTrigger that is never measured keeps
        // `start: 0 / end: undefined` and holds its timeline at progress 0
        // forever, so the entrance would silently never play. Refreshing this
        // one instance (not `ScrollTrigger.refresh()`) corrects it without
        // re-measuring or touching any other trigger on the page.
        entrance.scrollTrigger?.refresh()
      }, section)

      observer?.disconnect()
      observer = null
    }

    observer = new MutationObserver(create)
    observer.observe(document.body, { childList: true, subtree: true })
    create()

    return () => {
      observer?.disconnect()
      observer = null
      // Reverts every inline state this timeline wrote and kills the timeline
      // with its trigger, so a teardown can never strand the section
      // half-revealed.
      context?.revert()
      context = null
    }
  }, [])

  const mailtoHref = CONTACT_EMAIL_CONFIGURED ? buildMailtoHref() : ''
  const gmailHref = CONTACT_EMAIL_CONFIGURED ? buildGmailComposeUrl() : ''

  const missingSocials = SOCIAL_PROFILES.filter(
    (profile) => profile.url.trim().length === 0,
  ).map((profile) => profile.platform)

  // The two compose actions are rendered as genuinely disabled buttons while no
  // address is configured — never as an empty `mailto:` target and never as a
  // link to an invented destination.
  const primaryInner = (
    <>
      <span>Write me an email</span>
      <ArrowRight />
    </>
  )
  const gmailInner = (
    <>
      <span>Open in Gmail</span>
      <ArrowExternal />
    </>
  )

  return (
    <section
      id="contact"
      className="contact"
      ref={sectionRef}
      aria-labelledby="contact-title"
    >
      {/* ------------------------------------------------------------------
          LEFT — the developer portrait.

          The real transparent artwork (`assets/my_background-contact.png`,
          a ~1:1 cutout) is imported in src/contactInfo.ts and handed over as
          PORTRAIT_SRC. It is anchored to the section's bottom-left, up to 46%
          of the width and at most 96% of the viewport height, and it sits at
          z-index 0 — behind the central and right panels — so it can never
          obscure them.
          ------------------------------------------------------------------ */}
      <div className="contact__portrait" ref={portraitRef}>
        <img
          className="contact__portrait-img"
          src={PORTRAIT_SRC}
          alt="Portrait of the developer"
          decoding="async"
        />
      </div>

      {/* ------------------------------------------------------------------
          LOWER-LEFT — the personal note. Deliberately subordinate to the
          email action: smaller type, muted ink, and a short localized scrim so
          it stays readable over the portrait without a site-wide gradient.
          ------------------------------------------------------------------ */}
      <aside className="contact__note" ref={noteRef}>
        <p className="contact__note-title">A quick note</p>
        <p className="contact__note-body">
          Good work starts with a good conversation. I&rsquo;m always interested
          in thoughtful projects, ambitious ideas, and people who care about the
          details. Tell me what you&rsquo;re building.
        </p>
      </aside>

      {/* ------------------------------------------------------------------
          CENTRE — the introduction and the business-email panel.
          ------------------------------------------------------------------ */}
      <div className="contact__inner">
        <div className="contact__intro" ref={introRef}>
          <p className="contact__eyebrow">
            <span className="contact__eyebrow-num">03</span>
            <span className="contact__eyebrow-line" aria-hidden="true" />
            <span className="contact__eyebrow-text">Let&rsquo;s Connect</span>
          </p>

          <h2 className="contact__headline" id="contact-title">
            <span className="contact__headline-line">Have something</span>
            <span className="contact__headline-line contact__headline-accent">
              in mind?
            </span>
          </h2>

          <p className="contact__support">
            Have a project, an idea, or a question? Send me a message directly.
          </p>
        </div>

        {/* THE BUSINESS-EMAIL PANEL — one coherent panel, not a card per
            action. */}
        <div className="contact__email" ref={emailRef}>
          <p className="contact__email-eyebrow">
            <span className="contact__email-dot" aria-hidden="true" />
            <span className="contact__email-eyebrow-text">Business Email</span>
          </p>

          <div className="contact__email-row">
            <span
              className={
                CONTACT_EMAIL_CONFIGURED
                  ? 'contact__email-value'
                  : 'contact__email-value contact__email-value--unset'
              }
            >
              {CONTACT_EMAIL_CONFIGURED
                ? CONTACT_EMAIL
                : 'Business email not configured'}
            </span>

            <button
              type="button"
              className={`contact__copy contact__copy--${copyState}`}
              onClick={handleCopy}
              disabled={!CONTACT_EMAIL_CONFIGURED}
              aria-label="Copy business email"
            >
              {copyState === 'ok' ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>

          {/* Visible + screen-reader feedback for the copy attempt. Announced
              politely so it never interrupts, and never shown before the write
              actually resolved. */}
          <p className="contact__copy-status" role="status" aria-live="polite">
            {copyState === 'ok'
              ? 'Copied'
              : copyState === 'error'
                ? 'Copy failed — select the address and copy it manually'
                : ''}
          </p>

          {CONTACT_EMAIL_CONFIGURED ? (
            <>
              <a
                className="contact__action contact__action--primary"
                href={mailtoHref}
              >
                {primaryInner}
              </a>

              <p className="contact__hint">
                Opens a draft in your own email application, ready to edit and
                send from there.
              </p>

              <div className="contact__or">
                <span className="contact__or-line" aria-hidden="true" />
                <span className="contact__or-text">or</span>
                <span className="contact__or-line" aria-hidden="true" />
              </div>

              <a
                className="contact__action contact__action--ghost"
                href={gmailHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {gmailInner}
              </a>
            </>
          ) : (
            <>
              {/* Disabled — NOT an empty mailto: and NOT an invented target. */}
              <button
                type="button"
                className="contact__action contact__action--primary"
                disabled
              >
                {primaryInner}
              </button>

              <p className="contact__hint">
                Opens a draft in your own email application, ready to edit and
                send from there.
              </p>

              <div className="contact__or">
                <span className="contact__or-line" aria-hidden="true" />
                <span className="contact__or-text">or</span>
                <span className="contact__or-line" aria-hidden="true" />
              </div>

              <button
                type="button"
                className="contact__action contact__action--ghost"
                disabled
              >
                {gmailInner}
              </button>

              {/* Development note. Rendered ONLY while a value is missing, so it
                  removes itself the moment the real address is configured. */}
              <p className="contact__devnote">
                Set <code>CONTACT_EMAIL</code> in{' '}
                <code>src/contactInfo.ts</code> to enable these actions.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------
          RIGHT — the social-profile panel. Each row is one platform, laid out
          in the two columns `.contact__social-link` declares: the platform name
          with its short supporting label on the left, and the authentic brand
          mark alone in the fixed right-hand column. There is no arrow, no
          circular control and no third element — nothing else may occupy that
          column, so all five marks share one alignment axis.
          A row whose URL has not been supplied stays visible but is rendered as
          a plain, non-interactive element — never a link to the platform home
          page and never `href="#"`.
          ------------------------------------------------------------------ */}
      <aside
        className="contact__social"
        ref={socialRef}
        aria-labelledby="contact-social-title"
      >
        <h3 className="contact__social-title" id="contact-social-title">
          Find me elsewhere
        </h3>

        <ul className="contact__social-list">
          {SOCIAL_PROFILES.map((profile) => {
            const active = profile.url.trim().length > 0
            // Source order IS column order: the copy block comes first and takes
            // the flexible column, the mark second and takes the fixed
            // right-hand one. The brand modifier is only a hook for sizing the
            // two solid-tile marks for optical parity — see contact.css.
            const row = (
              <>
                <span className="contact__social-meta">
                  <span className="contact__social-name">{profile.platform}</span>
                  <span className="contact__social-label">{profile.label}</span>
                </span>
                <span
                  className={`contact__social-logo contact__social-logo--${profile.id}`}
                  aria-hidden="true"
                >
                  <SocialGlyph id={profile.id} />
                </span>
              </>
            )

            return (
              <li className="contact__social-item" key={profile.id}>
                {active ? (
                  <a
                    className="contact__social-link"
                    href={profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {row}
                    <span className="contact__sr">
                      {' '}
                      (opens in a new tab)
                    </span>
                  </a>
                ) : (
                  <span
                    className="contact__social-link contact__social-link--inactive"
                    aria-disabled="true"
                  >
                    {row}
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        {/* Development note. Rendered ONLY while at least one profile URL is
            missing, so it removes itself once the real values are supplied. */}
        {missingSocials.length > 0 ? (
          <p className="contact__social-note">
            Awaiting verified profile links:{' '}
            <span className="contact__social-note-list">
              {missingSocials.join(', ')}
            </span>
          </p>
        ) : null}
      </aside>
    </section>
  )
}
