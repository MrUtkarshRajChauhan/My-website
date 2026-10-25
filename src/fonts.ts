/**
 * WEBFONT REGISTRATION
 * ---------------------------------------------------------------------------
 * The three webfont files ship as public/ assets:
 *
 *   public/fonts/ClashDisplay-Variable.woff2            (weight range 200-700)
 *   public/fonts/PlayfairDisplay-VariableFont_wght.ttf  (weight range 400-900)
 *   public/fonts/PlayfairDisplay-Italic-VariableFont_wght.ttf (italic cut)
 *
 * They are copies, made when the fonts were wired up, of:
 *   ClashDisplay_Complete/Fonts/WEB/fonts/ClashDisplay-Variable.woff2
 *   PlayfairDisplay-VariableFont_wght.ttf
 *   PlayfairDisplay-Italic-VariableFont_wght.ttf
 * (repo root). The originals remain untouched. See also the licence note in
 * src/styles/typography.css for the Clash Display FFL licence.
 *
 * WHY A RUNTIME STYLE TAG INSTEAD OF @font-face IN CSS
 * CSS `url()` values are resolved by Vite either against the stylesheet's own
 * location (relative paths - which move between the source tree, the dev
 * server and the bundled output) or left untouched (absolute paths - which
 * then point at the DOMAIN ROOT and 404 when the site is deployed under a
 * subpath such as GitHub Pages' /My-website/). Neither can ask for a
 * public/ asset addressed relative to the deploy base. Injecting the rules at
 * runtime with Vite's import.meta.env.BASE_URL produces '/' in dev and './'
 * in the production build, so every font URL lands on the deployed document
 * folder no matter where the site is served from.
 */
const BASE: string = import.meta.env.BASE_URL

const FONT_CSS = `
@font-face {
  font-family: 'ClashDisplay';
  src: url('${BASE}fonts/ClashDisplay-Variable.woff2') format('woff2-variations'),
       url('${BASE}fonts/ClashDisplay-Variable.woff2') format('woff2');
  font-weight: 200 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Playfair Display';
  src: url('${BASE}fonts/PlayfairDisplay-VariableFont_wght.ttf') format('truetype-variations'),
       url('${BASE}fonts/PlayfairDisplay-VariableFont_wght.ttf') format('truetype');
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Playfair Display';
  src: url('${BASE}fonts/PlayfairDisplay-Italic-VariableFont_wght.ttf') format('truetype-variations'),
       url('${BASE}fonts/PlayfairDisplay-Italic-VariableFont_wght.ttf') format('truetype');
  font-weight: 400 900;
  font-style: italic;
  font-display: swap;
}
`

export function initFonts(): void {
  const existing = document.getElementById('site-webfonts')
  if (existing) return

  const style = document.createElement('style')
  style.id = 'site-webfonts'
  style.textContent = FONT_CSS
  document.head.appendChild(style)
}

initFonts()
