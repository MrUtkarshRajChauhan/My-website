import { useRef, useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { emitScrollProgress } from './progressBus'

gsap.registerPlugin(ScrollTrigger)

// Precompute all 183 frame paths in deterministic order
//
// Two byte-for-byte equivalent frame sets are available:
//   frames-public  - the original 4:2:0 JPEGs (6.5 MB total)
//   frames-hq       - re-encoded 4:4:4 from the source mp4 (29 MB total)
//
// Default to the highest-quality available set (frames-hq) to restore the
// intended cinematic sharpness. Allow explicit override to the lighter set
// via ?frames=public if needed; any other value falls back to HQ.
const params = new URLSearchParams(window.location.search)
const frameParam = params.get('frames')
const FRAME_SET = frameParam === 'public' ? 'frames-public' : 'frames-hq'

const allFrames: string[] = []

// The frames live in public/, so their URL must be built from Vite's base URL
// rather than hand-written. A literal '../frames-hq/...' or '/frames-hq/...'
// resolves against the deploy root and 404s when the site is served from a
// subpath (GitHub Pages serves this repo at /My-website/). import.meta.env.BASE
// _URL is '/' in dev and './' in the production build, so the same code works
// at the domain root and under any subdirectory.
for (let i = 1; i <= 183; i++) {
  const num = i.toString().padStart(3, '0')
  allFrames.push(`${import.meta.env.BASE_URL}${FRAME_SET}/ezgif-frame-${num}.jpg`)
}

// Cinematic constant: source frames are 16:9 ratio
const CINEMATIC_RATIO = 16 / 9 // ~1.7778

export function CinematicCanvas() {
  // ==================== REFS (imperative, no React re-renders) ====================
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // -1 = nothing painted yet, so the first render of Frame 001 is not skipped.
  const lastValidFrameRef = useRef(-1)     // last frame successfully rendered
  const currentFrameRef = useRef(0)        // current frame index
  const scrollProgressRef = useRef(0)      // last ScrollTrigger progress value

  // State for loaded images (Map for O(1) lookup, no re-renders)
  const [images, setImages] = useState<Map<number, HTMLImageElement>>(new Map())
  const [initialized, setInitialized] = useState(false)
  // Flips true once every frame request has settled (loaded OR failed), so the
  // ScrollTrigger machinery is initialised even if some frames never arrive.
  const [settled, setSettled] = useState(false)

  // ==================== CANVAS & DPI ====================
  const dprRef = useRef(Math.min(window.devicePixelRatio || 1, 2))
  // The box/buffer sync is created once the canvas + first frame exist, and is
  // also reachable from the debounced resize handler above.
  const canvasSizeRef = useRef<(() => void) | null>(null)

  // ==================== VIEWPORT BOX + DRAWING BUFFER ====================
  // The canvas is the ScrollTrigger trigger AND the pinned element, so its
  // on-screen box is the cinematic viewport. It must be the viewport and
  // nothing else, or the framing is not stable.
  //
  // This used to be `style={{width:'100%',height:'100%'}}` with the buffer
  // sized from getBoundingClientRect(). Both are wrong here:
  //
  //   * The canvas is a direct child of the React root, which has no height of
  //     its own, so `height: 100%` has no definite containing block and falls
  //     back to `auto` - i.e. the element's intrinsic size, which is the
  //     DRAWING BUFFER size. The element therefore became 1584x891 inside a
  //     1584x749 viewport: 142px of every frame sat permanently off-screen.
  //   * While pinned, position:fixed pinned that 891px box at top:0, so the
  //     frame's top 749px was visible and its bottom 142px was cropped. When
  //     the pin released the element went static at the end of the pin range,
  //     so the frame's BOTTOM 749px became visible and the top 142px was
  //     cropped instead. The visible window jumped by 142px at the release
  //     boundary - the "sudden zoom/crop near the bottom".
  //
  // So the box is now stated in explicit pixels, owned here, and is the only
  // input to the buffer. The buffer is capped at the source's native 1920x1080
  // so a DPR-2 display gets one source pixel per device pixel instead of an
  // upscale. Buffer and box therefore always share a ratio, so the single fit
  // algorithm in renderFrame() covers the box with the 16:9 source (cropping
  // the overflow outside 16:9) and the browser's buffer->CSS rescale is
  // uniform (no stretch).
  //
  // Nothing in this function runs during scroll. onUpdate never touches size.

  // ==================== PRELOAD ALL 183 FRAMES PROGRESSIVELY ====================
  useEffect(() => {
    if (initialized) return
    setInitialized(true)

    let loaded = 0
    const total = allFrames.length
    const imagesMap = new Map<number, HTMLImageElement>()

    // A frame that fails to load must never enter the map: renderFrame() can
    // then skip it and keep the last successfully painted frame on screen.
    // (An earlier version stored a bare object as an error placeholder, which
    // was then handed to drawImage and threw "The provided image value is
    // invalid" on every scroll update.) Each handler below therefore only
    // counts the request as SETTLED - success also stores the image.
    function settleImage(index: number, img: HTMLImageElement | null) {
      if (img) imagesMap.set(index, img)
      loaded++
      maybeFinish()
    }

    // Immediately add Frame 0 on mount - no blank canvas. noUncheckedIndexedAccess
    // marks array indexes `string | undefined`; an empty-string src can never
    // happen here (index 0 of a fixed 183-entry list) but the guard keeps the
    // strict check honest without changing behaviour.
    const img0 = new Image()
    img0.src = allFrames[0] ?? ''
    img0.onload = () => settleImage(0, img0)
    img0.onerror = () => settleImage(0, null)

    // Preload remaining frames progressively
    for (let i = 1; i < total; i++) {
      const img = new Image()
      img.src = allFrames[i] ?? ''
      img.onload = () => settleImage(i, img)
      img.onerror = () => settleImage(i, null)
    }

    function maybeFinish() {
      if (loaded === total) {
        setImages(imagesMap)
        setSettled(true)
      }
    }
  }, [initialized])

  // ==================== RESIZE ====================
  // ORDERING IS THE WHO POINT OF THIS EFFECT.
  //
  // ScrollTrigger's pin reserves scroll room with a "sizer" element sized from
  // the pinned element's height at the moment it measures. If the canvas is
  // still the old size when that measurement runs, the sizer is left holding
  // the pre-resize height, and the document ends up longer than the pin: at
  // 1500x950 the doc measured 7.225 viewports against a 6.000 viewport pin, so
  // ~180px of scroll sat past the pin's end, where the element is unpinned and
  // drifts up out of frame - the same crop-at-release failure as before, just
  // reached through a different door.
  //
  // So the box is re-derived SYNCHRONOUSLY on the resize event itself, ahead of
  // any refresh, and only ScrollTrigger.refresh() is debounced (in
  // smoothScroll, 150ms later). That single change also removes the race
  // between two independent debounced handlers: whichever listener registered
  // first, the canvas is already correct by the time the refresh is measured.
  //
  // This is safe to do per-event: syncCanvasSize() is a pure diff. It writes two
  // inline px values only if they differ, and touches canvas.width/height plus
  // one repaint only if the buffer actually changed. Repeated resize events at
  // a size already applied cost two string comparisons.
  useEffect(() => {
    const onResize = () => {
      dprRef.current = Math.min(window.devicePixelRatio || 1, 2)
      canvasSizeRef.current?.()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ==================== INITIALIZE SCROLLTRIGGER WITH 16:9 TUNING ====================
  useEffect(() => {
    if (!initialized || !settled) return

    // Frame 001 may have failed to load (e.g. an asset is genuinely missing on
    // the server). Do not bail out of the whole cinematic in that case: the
    // trigger, box sizing and progress bus still work, and renderFrame simply
    // has no image to paint yet. syncCanvasSize() below is written to cope
    // with img0 being absent.
    const img0 = images.get(0)

    const canvas = canvasRef.current
    if (!canvas) return

    // === BOX OWNERSHIP ===
    // The box is the viewport, in explicit px. Never a percentage: see the note
    // above on why 100%/auto was cropping 142px of every frame.
    const applyBox = (boxW: number, boxH: number) => {
      const style = canvas.style
      if (style.width !== boxW + 'px') style.width = boxW + 'px'
      if (style.height !== boxH + 'px') style.height = boxH + 'px'
      // ScrollTrigger's pin writes max-width/max-height onto the pinned element,
      // recording the size it measured when the pin was created, and it does not
      // refresh them. They are then a permanent ceiling: load at 1280 and grow
      // to 1920 and the canvas stays clamped at 1264px while the navbar band
      // spans 1920, so the film silently stops being full-bleed. The element's
      // size is viewport-derived and therefore has no business being capped, so
      // the ceiling is cleared every time the box is (re)stated.
      if (style.maxWidth !== 'none') style.maxWidth = 'none'
      if (style.maxHeight !== 'none') style.maxHeight = 'none'
    }

    // Cheap, idempotent re-assertion of the box. Called on every ScrollTrigger
    // update, so it MUST NOT read layout: it compares style strings only, and
    // a healthy frame costs four string comparisons.
    //
    // It exists because ScrollTrigger's pin is a measure-once, restore-later
    // mechanism: on release it puts back the size it recorded when the pin was
    // created. With a viewport-sized element that restores a stale size - after
    // a resize the released element was measured at 1914x979 in a 1264x765
    // viewport - and the frame visibly jumped. Diffing the inline box catches
    // that the instant it happens, in the same tick, before anything is painted.
    const ensureBox = (): boolean => {
      const boxW = Math.max(1, Math.round(window.innerWidth))
      const boxH = Math.max(1, Math.round(window.innerHeight))
      const style = canvas.style
      if (
        style.width === boxW + 'px' &&
        style.height === boxH + 'px' &&
        style.maxWidth === 'none' &&
        style.maxHeight === 'none'
      ) {
        return false
      }
      applyBox(boxW, boxH)
      return true
    }

    // === PIN SPACING RECONCILIATION ===
    // ScrollTrigger reserves the pin's scroll room with a wrapper it inserts
    // around the pinned element, and it sets that wrapper's own width/height
    // when the pin is CREATED - it never rewrites them, only the padding that
    // reserves the distance. So after a viewport change the wrapper is one
    // measurement behind: its height stays (oldElementHeight + newDistance)
    // while its padding correctly becomes the new distance, and the document
    // ends up (oldHeight - newHeight) px longer than the pin.
    //
    // That surplus is the bug the report describes, reached by another route.
    // Scrolling into it happens with the element already unpinned, so at the
    // exact bottom the frame is dragged up out of view: measured -124px at
    // 1484x799 and -214px at 1264x765, with only part of the frame on screen.
    //
    // The correction deliberately nudges by a MEASURED delta rather than
    // recomputing a height from assumptions about how the wrapper accounts for
    // its padding. Read the wrapper's used height and its own computed
    // padding-bottom - the padding IS the pin distance - and move the wrapper by
    // exactly the shortfall. That converges in one step and stays correct even
    // if the wrapper's box model changes, because nothing here assumes one.
    //
    // The wrapper's height is measured rather than the document's, so this
    // cannot fight later sections added after the cinematic: those live outside
    // the wrapper and are never part of this arithmetic.
    const reconcilePinSpacing = (boxH: number) => {
      const spacer = canvas.parentElement
      if (!spacer || !spacer.classList.contains('pin-spacer')) return
      const distance = parseFloat(getComputedStyle(spacer).paddingBottom) || 0
      const have = spacer.getBoundingClientRect().height
      const want = boxH + distance
      const delta = want - have
      if (Math.abs(delta) < 0.5) return
      spacer.style.height = Math.max(0, have + delta) + 'px'
    }

    // === THE SINGLE BOX + BUFFER AUTHORITY ===
    // Derives the box from window.innerWidth/Height rather than reading the
    // element back. This runs from onRefresh, inside ScrollTrigger's own
    // measurement pass, where a self-referential getBoundingClientRect() would
    // be both a forced synchronous layout and one frame stale.
    //
    // (reconcilePinSpacing below does read layout, but only its wrapper, and
    // only on a refresh - never on the per-frame path.)
    //
    // Returns true when the backing store changed, i.e. when the bitmap was
    // cleared and the current frame must be repainted.
    const syncCanvasSize = (): boolean => {
      const boxW = Math.max(1, Math.round(window.innerWidth))
      const boxH = Math.max(1, Math.round(window.innerHeight))
      const dpr = dprRef.current

      // Never rasterise above the source's native resolution: an upscale would
      // resample 183 frames for no extra detail.
      let bufW = Math.round(boxW * dpr)
      let bufH = Math.round(boxH * dpr)
      // Frame 001 may be missing on the server; without a loaded image there
      // is no native resolution to cap against, so fall back to uncapped DPR.
      const srcW = img0?.naturalWidth ?? 0
      const srcH = img0?.naturalHeight ?? 0
      const cap = srcW > 0 && srcH > 0 ? Math.min(1, srcW / bufW, srcH / bufH) : 1
      bufW = Math.max(1, Math.round(bufW * cap))
      bufH = Math.max(1, Math.round(bufH * cap))

      applyBox(boxW, boxH)

      if (canvas.width === bufW && canvas.height === bufH) return false
      // Assigning width/height clears the bitmap; the caller repaints.
      canvas.width = bufW
      canvas.height = bufH
      return true
    }
    canvasSizeRef.current = syncCanvasSize

    // Size before ScrollTrigger measures the pin, so the pin records the
    // viewport box rather than a stale intrinsic one.
    syncCanvasSize()

    // Set up cinematic scroll distance
    //
    // The trigger is the canvas, which is exactly one viewport tall, so the
    // pin-spacer is (1 + 6) viewports and the document is 7 viewports: 600vh of
    // scroll for 183 frames, ~33px of scroll per frame step.
    //
    // Because the element is exactly the viewport tall, the pin hands the frame
    // off at release without re-cropping it: at the final scroll position the
    // element's own box coincides with the viewport. That equality is the whole
    // reason the box is set in explicit px above.
    //
    // The end is a FUNCTION so ScrollTrigger re-evaluates it on refresh. A px
    // string like "+=4494" is captured once at creation and silently goes stale
    // when the viewport height changes, which would leave the pin releasing at the
    // wrong scroll position.
    const endVal = () => `+=${window.innerHeight * 6}`

    // Hold the trigger so the cleanup can kill it on unmount. Without this,
    // React StrictMode's double mount in dev leaves TWO trigger objects and
    // two pin-spacers around one canvas, and the pin-spacer ScrollTrigger
    // wraps around the canvas is the wrapper React then fails to remove the
    // canvas from on unmount ("Failed to execute 'removeChild' on 'Node'").
    // Killing the trigger reverts the pin and detaches the pin-spacer, which
    // keeps React's own unmount path valid.
    let trigger: ScrollTrigger | null = new ScrollTrigger({
      trigger: canvas,
      start: 'top top',
      end: endVal,
      scrub: true,
      pin: true,
      onUpdate: (self) => {
        // Re-assert the box first. This is a string diff, not a layout read,
        // so it costs nothing on a healthy frame, and it repairs the size the
        // moment ScrollTrigger's pin restores a stale one.
        ensureBox()

        // Store progress via ref - avoid React state for performance
        scrollProgressRef.current = self.progress

        // Broadcast the same single source of truth to the fixed UI layer
        // (navbar CTA state, hero red-group exits). Additive and passive: the
        // frame selection and rendering below are untouched.
        emitScrollProgress(self.progress)

        // Calculate target frame - use ref for current frame
        const targetFrame = Math.max(0, Math.min(182, Math.round(self.progress * 182)))

        // Draw immediately. onUpdate already runs inside the GSAP ticker, which
        // is itself driven by a single requestAnimationFrame, so the draw is
        // already synchronised with the display.
        //
        // An earlier version wrapped this in requestAnimationFrame and cancelled
        // the pending request on every update. GSAP's ticker and the browser's
        // rAF are separate callbacks, so each update cancelled a rAF that had
        // not yet fired: 198 progress updates collapsed into 1 draw.
        //
        // Measured cadence on a real display (25 wheel notches, 45ms apart):
        // median dwell 20.1ms = exactly one display frame, and zero index skips,
        // so frame advance is already display-locked. The residual unevenness
        // is inherent to 183 discrete stills spanning 600vh (~25px of scroll per
        // frame step), not a timing desynchronisation. No cross-fade is applied:
        // only the 183 real frames are ever drawn.
        renderFrame(targetFrame)
      },
      onRefresh: () => {
        // Fires on load and after every resize refresh. Runs AFTER ScrollTrigger
        // has re-measured and re-pinned, so this is the last word on the box:
        // syncCanvasSize clears the pin's stale max-width/max-height ceiling,
        // and reconcilePinSpacing puts the document back to exactly
        // elementHeight + pinDistance so the pin's end coincides with the
        // maximum scroll position and there is no surplus scroll past it.
        const boxH = Math.max(1, Math.round(window.innerHeight))
        const bitmapCleared = syncCanvasSize()
        reconcilePinSpacing(boxH)
        if (bitmapCleared) {
          renderFrame(Math.max(0, lastValidFrameRef.current), true)
        }
      },
    })

    canvasSizeRef.current = () => {
      if (syncCanvasSize()) renderFrame(Math.max(0, lastValidFrameRef.current), true)
    }

    // Paint Frame 001 immediately. Forced, because the onUpdate guard skips
    // frame 0 at progress 0, so without this the canvas stays transparent until
    // the first scroll that advances the index.
    renderFrame(0, true)

    return () => {
      // kill() reverts the pin: the pin-spacer is removed and the canvas is
      // restored as a direct child of the React root, exactly the state React
      // created it in. No direct DOM removal happens here - GSAP owns the
      // wrapper it made, and React keeps owning its own tree.
      trigger?.kill()
      trigger = null
    }
  }, [initialized, settled])

  // ==================== RENDER FRAME WITH BLANK PREVENTION & 16:9 COMPOSITION ====================
  // force = repaint even when the index is unchanged. Required after a canvas
  // resize, which wipes the bitmap.
  function renderFrame(targetFrame: number, force = false) {
    currentFrameRef.current = targetFrame

    // Draw only when the frame index actually changes. ScrollTrigger can call
    // onUpdate several times per display frame while Lenis is easing; skipping
    // an identical index avoids re-rasterising the same picture.
    //
    // lastValidFrameRef starts at -1, not 0, so the very first call paints
    // Frame 001 instead of being treated as a no-op repeat.
    if (!force && targetFrame === lastValidFrameRef.current) {
      return
    }

    if (!canvasRef.current || !images.has(targetFrame)) {
      // Frame not loaded yet - keep last valid frame visible
      // Do NOT clear the canvas - that would cause blank/flash
      return
    }

    // Only draw a frame that actually loaded and fully decoded. Failed
    // requests never enter the map, and the completeness/naturalWidth check
    // also covers an image whose decode has not finished: skipping the draw
    // keeps the LAST VALID FRAME on screen, which is exactly the fallback the
    // animation contract calls for. A bare object entry can therefore never
    // reach drawImage again - the "provided image value is invalid" crash is
    // structurally impossible now.
    const img = images.get(targetFrame)
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) {
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Use high-quality resampling. The 2D context defaults to "low" (bilinear),
    // which is the main source of the soft look: the browser then downscales the
    // frame with a cheap 4-tap filter. "high" requests the better filter.
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const canvasW = canvas.width
    const canvasH = canvas.height
    const imgW = img.width
    const imgH = img.height

    // === THE ONE IMAGE-FIT ALGORITHM ===
    // Every one of the 183 frames goes through exactly this code with the same
    // three-way branch, and the destination rect is a pure function of the
    // canvas buffer - which only changes when the viewport changes. There is no
    // progress term anywhere in it, so the visible window is bit-identical at
    // progress 0, at progress 0.5 and at progress 1. Nothing is scaled,
    // translated, rotated, zoomed or cropped by scroll position.
    //
    // The source is 16:9 and is fitted COVER-style so the hero background
    // reaches every edge of the viewport: the short axis is scaled to fill and
    // the overflow on the long axis is cropped symmetrically, instead of
    // leaving bars of page background down the sides. At exactly 16:9 cover
    // and contain are identical, so the canonical 1280-1920 stage is unchanged
    // and the crop only appears on viewports that are not 16:9.
    const viewportRatio = canvasW / canvasH
    const sourceRatio = imgW / imgH // 16/9 for every frame in the set

    let drawX = 0
    let drawY = 0
    let drawW = canvasW
    let drawH = canvasH

    if (viewportRatio > CINEMATIC_RATIO) {
      // Viewport wider than 16:9: fill the width, crop top and bottom.
      drawW = canvasW
      drawH = canvasW / sourceRatio
      drawX = 0
      drawY = (canvasH - drawH) / 2
    } else if (viewportRatio < CINEMATIC_RATIO) {
      // Viewport taller than 16:9: fill the height, crop the sides.
      drawH = canvasH
      drawW = canvasH * sourceRatio
      drawX = (canvasW - drawW) / 2
      drawY = 0
    }
    // else: exact 16:9, the frame fills the box exactly (contain === cover).

    // === DRAW FRAME ===
    // No clearRect: the previous frame is fully overwritten by an opaque
    // drawImage over the same rect, and clearing would only risk a flash.
    // No cross-fade, no interpolation, no blur: the 183 real stills are drawn
    // one at a time and motion continuity comes from the scroll timing.
    ctx.globalAlpha = 1
    ctx.drawImage(img, drawX, drawY, drawW, drawH)

    lastValidFrameRef.current = targetFrame
  }

  // ==================== EFFECT: CLEANUP ON UNMOUNT ====================
  // There is deliberately no requestAnimationFrame of our own. GSAP's ticker is
  // the single rAF loop for the page: smoothScroll drives Lenis from it, and
  // ScrollTrigger's onUpdate - which draws - runs inside it. A second loop here
  // would be a competing render cadence.
  useEffect(() => {
    return () => {
      canvasSizeRef.current = null
    }
  }, [])

  // ==================== RETURN: SINGLE CANVAS ELEMENT ====================
  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%' }}
    />
  )
}