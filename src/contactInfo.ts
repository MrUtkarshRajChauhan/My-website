/**
 * CONTACT — THE SINGLE AUTHORITATIVE CONFIGURATION POINT.
 *
 * Everything the Contact section needs from the outside world lives here and
 * nowhere else, so there is exactly one place to edit and no value can drift
 * between the markup, the copy action and the two compose actions.
 *
 * NOTHING IN THIS FILE IS INVENTED. The project was audited for verified
 * contact information and found to contain:
 *   • no business email address anywhere in the source, the assets or the
 *     HTML — `hello@sarin.dev` only ever appeared in a generated design
 *     mockup and is therefore deliberately NOT used here;
 *   • no LinkedIn / Instagram / GitHub / Facebook / X profile URLs.
 *
 * The developer portrait is the exception: the real transparent artwork in
 * `assets/` is imported below, so PORTRAIT_SRC is a resolved build URL rather
 * than a hand-written filename.
 *
 * Every remaining value below is left as an empty string until the owner
 * supplies the real one. An empty value is a first-class state, not a bug: the
 * section renders the full designed layout, marks the slot as a development
 * placeholder, and disables — never fakes — the actions that would need a
 * real destination. A clickable control is NEVER given an invented address,
 * profile or `href="#"`.
 *
 * To publish: fill in the remaining groups below and nothing else needs to
 * change.
 */

/* The one value that IS supplied: the real transparent portrait artwork. Vite
   resolves it to a fingerprinted build URL, so this is a genuine asset import
   rather than a hand-written filename. */
import portraitArtwork from '../assets/my_background-contact.png'

/**
 * TODO(contact): the owner's verified business email address.
 *
 * While this is empty the email panel stays fully visible but shows a clearly
 * marked development placeholder, and BOTH compose actions are rendered as
 * genuinely disabled buttons (never an empty `mailto:`). Once a real address
 * is set, the address renders, the copy control becomes live and both actions
 * activate automatically.
 */
export const CONTACT_EMAIL: string = ''

/**
 * The developer's transparent-background portrait.
 *
 * Supplied for real: the source `assets/my_background-contact.png`
 * (379x375, truecolour + alpha) is imported through Vite so the original
 * pixels and transparency are copied into the build and the URL is resolved by
 * the bundler — never a hand-written filename, and no request that could 404.
 */
export const PORTRAIT_SRC: string = portraitArtwork

/** The six platforms, in the approved order. Rows never change or reorder. */
export type SocialId =
  | 'linkedin'
  | 'instagram'
  | 'github'
  | 'facebook'
  | 'x'
  | 'reddit'

export type SocialProfile = {
  id: SocialId
  /** Platform name shown on the row. */
  platform: string
  /** Short, factual supporting label. Never a marketing claim. */
  label: string
  /**
   * The owner's VERIFIED profile URL, or '' while it has not been supplied.
   * A row whose url is empty stays visible but non-interactive: it is rendered
   * as a plain element, never as a link to the platform home page, never as
   * `href="#"`.
   */
  url: string
}

// TODO(contact): replace each empty `url` below with the owner's real profile
// URL. Required to activate all six rows: LinkedIn, Instagram, GitHub,
// Facebook, X, Reddit. Until then the rows render non-interactively.
export const SOCIAL_PROFILES: SocialProfile[] = [
  {
    id: 'linkedin',
    platform: 'LinkedIn',
    label: 'Professional network',
    url: '',
  },
  {
    id: 'instagram',
    platform: 'Instagram',
    label: 'Visual work and updates',
    url: '',
  },
  {
    id: 'github',
    platform: 'GitHub',
    label: 'Selected public projects',
    url: '',
  },
  {
    id: 'facebook',
    platform: 'Facebook',
    label: 'Social profile',
    url: '',
  },
  {
    id: 'x',
    platform: 'X (Twitter)',
    label: 'Updates and conversations',
    url: '',
  },
  {
    id: 'reddit',
    platform: 'Reddit',
    label: 'Communities and discussions',
    url: '',
  },
]

/** The draft subject shared by the `mailto:` and the Gmail compose actions. */
export const CONTACT_SUBJECT = 'Project enquiry'

/**
 * The draft body, line by line. Kept as an array so the blank-line rhythm is
 * explicit and can never be lost to a stray escaping rule. Joined with '\n'
 * and percent-encoded by the builders below, so a query string can never carry
 * a raw space, line break or reserved character.
 */
export const CONTACT_BODY_LINES: string[] = [
  'Hi,',
  '',
  'I came across your portfolio and would like to discuss a project.',
  '',
  'Project details:',
  '',
  'Timeline:',
  '',
  'Budget range:',
  '',
  'Best regards,',
]

/** The plain-text draft body, joined with real newlines. */
export const CONTACT_BODY = CONTACT_BODY_LINES.join('\n')

/** True once a real address has been configured. Drives every enabled state. */
export const CONTACT_EMAIL_CONFIGURED = CONTACT_EMAIL.trim().length > 0

/**
 * `mailto:` — the universal action. The visitor's own configured handler opens
 * an editable draft; nothing is ever sent automatically. Subject and body are
 * `encodeURIComponent`-encoded, so spaces arrive as %20 and the newlines in the
 * body arrive as %0A rather than as raw control characters.
 */
export function buildMailtoHref(email: string = CONTACT_EMAIL): string {
  const subject = encodeURIComponent(CONTACT_SUBJECT)
  const body = encodeURIComponent(CONTACT_BODY)
  return `mailto:${email}?subject=${subject}&body=${body}`
}

/**
 * Gmail's standard browser compose URL, prefilled with the same recipient,
 * subject and body. It is an ordinary web link, not a send operation: if the
 * visitor is not signed in to Gmail, Google itself asks them to authenticate,
 * and this never attempts to bypass that.
 *
 * Built with `URL` + `searchParams` so every value is encoded by the platform
 * rather than by hand.
 */
export function buildGmailComposeUrl(email: string = CONTACT_EMAIL): string {
  const url = new URL('https://mail.google.com/mail/')
  url.searchParams.set('view', 'cm')
  url.searchParams.set('fs', '1')
  url.searchParams.set('to', email)
  url.searchParams.set('su', CONTACT_SUBJECT)
  url.searchParams.set('body', CONTACT_BODY)
  return url.toString()
}
