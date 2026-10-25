import { useEffect } from 'react'

/**
 * Sheen tracking for the hero's primary CTA.
 *
 * The component renders no DOM of its own (it is a sibling of <Hero />, not a
 * parent — Hero mounts directly into the UI layer), so the buttons to track
 * are resolved from the document instead of from this component's own node. Resolving from `this`
 * node used to match nothing, which left the cursor-following --sheen-* vars
 * permanently unset and the radial sheen stuck at its centred default.
 *
 * Listeners are collected and detached on cleanup so hot reloads / StrictMode
 * double-mounts can never stack handlers on the same button.
 */
export function HeroSheen() {
  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLAnchorElement>('a.hero__cta--primary[data-sheen="true"]')
    const detach: Array<() => void> = []

    buttons.forEach((btn) => {
      const onMove = (e: PointerEvent) => {
        const rect = btn.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        btn.style.setProperty('--sheen-x', x.toFixed(2) + '%')
        btn.style.setProperty('--sheen-y', y.toFixed(2) + '%')
      }
      const onLeave = () => {
        btn.style.removeProperty('--sheen-x')
        btn.style.removeProperty('--sheen-y')
      }
      btn.addEventListener('pointermove', onMove)
      btn.addEventListener('pointerleave', onLeave)
      detach.push(() => {
        btn.removeEventListener('pointermove', onMove)
        btn.removeEventListener('pointerleave', onLeave)
      })
    })

    return () => detach.forEach((remove) => remove())
  }, [])

  return null
}