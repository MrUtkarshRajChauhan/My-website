import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initSmoothScroll } from './smoothScroll'
import { setLenis } from './lenisHandle'
// Webfonts must be registered before the app's CSS resolves font-family
// names; the rules live here so their URLs are Vite-base-relative (see
// fonts.ts). This side-effect import is idempotent.
import './fonts'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

// Keep the one Lenis instance reachable: the navbar routes its navigation
// through `lenis.scrollTo` so every existing scroll-linked animation plays and
// reverses naturally. Under prefers-reduced-motion initSmoothScroll bails out
// and this stays null, which is exactly the "navigate without the added
// animated travel" path.
setLenis(initSmoothScroll()?.lenis ?? null)

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)