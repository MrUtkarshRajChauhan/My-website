import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAboutEntrance } from './useAboutEntrance'
import { subscribeScrollProgress } from '../progressBus'
import { EXPERTISE_END, EXPERTISE_START } from '../aboutBeats'
import { ExpertiseMobileTrack } from './ExpertiseMobileTrack'
import { ExpertisePhonePanels } from './expertiseMobilePanels'
import {
  CATEGORIES,
  CORE,
  EDGES,
  JUNCTIONS,
  PRINCIPLES,
  PULSES,
  RAIL_ITEMS,
  TECHS,
  WORKFLOW,
  getTech,
  type ClusterId,
} from './expertiseData'

/**
 * EXPERTISE — the scene that receives the handoff from About.
 *
 * Two subject-safe regions around the protected central subject:
 *   LEFT  — concise explanatory content (two blocks + four principle tiles).
 *   RIGHT — a categorised technology ecosystem: the `03 — TECHNOLOGIES I USE`
 *           heading, eight named category groups holding 13 technology tiles,
 *           a glass `</>` code core, tilted orbit rings with glowing orbs,
 *           fine SVG connectors with travelling signal pulses, and the
 *           `Real-World Use Cases` workflow strip. A five-item progress rail
 *           sits on the outer right edge.
 *
 * ENTRANCE is scroll-driven: the left content slides in from the RIGHT within
 * its own clip lanes, and the categories/nodes reveal in fixed order using pure
 * functions of the shared progress. Nothing here starts a second scroll system.
 *
 * AMBIENT MOTION is one shared requestAnimationFrame loop for all node
 * transforms, connector geometry, orbs and pulses. It is gated by the existing
 * progress state (only runs once Expertise is active), pauses while the
 * document is hidden, never touches React state per frame, respects
 * prefers-reduced-motion, and stops cleanly on unmount.
 */

const ACCENT = 'expertise__accent'

/**
 * Mobile responsiveness has been removed from this build: the desktop
 * composition is authoritative at every viewport width. Both retired bands
 * can therefore never match — the desktop inline geometry is always written,
 * `data-lenis-prevent` is never set (Lenis owns the film everywhere) and the
 * ambient loop always runs. The constants and the machinery reading them are
 * kept only so the desktop path stays exactly as it was.
 */
const STACKED_FIELD_QUERY = '(min-width: 9999px)'

/**
 * Retired phone-panel band (see STACKED_FIELD_QUERY): can never match.
 */
const PHONE_PANEL_QUERY = '(min-width: 9999px)'

/**
 * Tilted elliptical orbit rings around the core. `rx` / `ry` are fractions of
 * the field width / height; `rot` is the ring's tilt in degrees. The outer ring
 * is deliberately allowed to leave the field (the wires SVG is clipped to the
 * field, so it reads as an outer arc instead of sweeping into the subject lane).
 */
const ORBITS = [
  { rx: 0.3, ry: 0.2, rot: -24 },
  { rx: 0.42, ry: 0.27, rot: 18 },
  { rx: 0.52, ry: 0.35, rot: -50 },
] as const

/**
 * Glowing orbs that drift slowly along the rings. `a` is the start angle in
 * degrees, `s` the drift speed in degrees per second (sign = direction).
 */
const ORBS = [
  { orbit: 0, a: 215, s: 5 },
  { orbit: 0, a: 20, s: -4 },
  { orbit: 1, a: 250, s: 3.5 },
  { orbit: 1, a: 110, s: -3 },
  { orbit: 2, a: 305, s: 2.5 },
  { orbit: 2, a: 165, s: -2 },
] as const

/** Minimal outlined principle icons — no icon package, no complex artwork.
 *  Concepts per the target spec: lightning bolt, cube, code brackets, users. */
const PRINCIPLE_ICONS: Record<string, ReactNode> = {
  focused: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <path d="M10.8 1.7L2.5 11.7h7.5L9.2 18.3 17.5 8.3H10z" />
    </svg>
  ),
  practical: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <path d="M10 2.2l6.1 3.4v7L10 16l-6.1-3.4v-7L10 2.2z" />
      <path d="M3.9 5.6l6.1 3.4 6.1-3.4M10 9v7" />
    </svg>
  ),
  modern: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <path d="M6.4 5.6L2.9 10l3.5 4.4M13.6 5.6L17.1 10l-3.5 4.4" />
    </svg>
  ),
  'client-ready': (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <circle cx="8" cy="6.6" r="2.5" />
      <path d="M3.2 14.8c0-2.6 2.2-4.7 4.8-4.7 2.7 0 4.8 2.1 4.8 4.7" />
      <circle cx="13.6" cy="7.2" r="2" />
      <path d="M13.9 10.2c1.9.4 3.2 2 3.2 4.1" />
    </svg>
  ),
}

export function Expertise() {
  const sectionRef = useRef<HTMLElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const coreRef = useRef<HTMLDivElement>(null)

  const EW = EXPERTISE_END - EXPERTISE_START

  // The one breakpoint React itself needs to know about: whether the field's
  // inline measurement geometry is allowed to exist. State, so a live resize
  // across 900px re-renders the panels with and without their desktop style;
  // on narrow viewports the mobile stylesheet owns the layout instead.
  // `phoneTrack` is the second half of that answer (<= 767px: the six-panel
  // track presentation), read alongside `stackedField` at every change so a
  // resize crossing both boundaries re-renders exactly once per boundary.
  const [stackedField, setStackedField] = useState(
    () => window.matchMedia(STACKED_FIELD_QUERY).matches,
  )
  const [phoneTrack, setPhoneTrack] = useState(() =>
    window.matchMedia(PHONE_PANEL_QUERY).matches,
  )
  useEffect(() => {
    const query = window.matchMedia(STACKED_FIELD_QUERY)
    const phone = window.matchMedia(PHONE_PANEL_QUERY)
    const onChange = () => {
      setStackedField(query.matches)
      setPhoneTrack(phone.matches)
    }
    query.addEventListener('change', onChange)
    phone.addEventListener('change', onChange)
    return () => {
      query.removeEventListener('change', onChange)
      phone.removeEventListener('change', onChange)
    }
  }, [])

  // Left explanatory content — enters from the RIGHT through its own clip lane.
  const b1Ref = useAboutEntrance(
    EXPERTISE_START + 0.02 * EW,
    EXPERTISE_START + 0.4 * EW,
  )
  const tilesRef = useAboutEntrance(
    EXPERTISE_START + 0.18 * EW,
    EXPERTISE_START + 0.56 * EW,
  )
  const b2Ref = useAboutEntrance(
    EXPERTISE_START + 0.46 * EW,
    EXPERTISE_START + 0.94 * EW,
  )

  useEffect(() => {
    const field = fieldRef.current
    const svg = svgRef.current
    const core = coreRef.current
    const section = sectionRef.current
    if (!field || !svg || !core) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // PHONE PANELS (<= 767px): the stacked field is `display: none` there —
    // the six phone compositions replace it — so the ambient loop's targets
    // never paint. The loop therefore does not run in that band at all (no
    // wasted rAF for hidden elements); crossing the 767px boundary re-states
    // the last progress so the gate flips without waiting for the next
    // scroll frame. Desktop/tablet behaviour is untouched.
    const phone = window.matchMedia(PHONE_PANEL_QUERY)

    const nodeEls = Array.from(field.querySelectorAll<HTMLElement>('[data-node]'))
    const nodeElMap = new Map<string, HTMLElement>()
    nodeEls.forEach((el) => nodeElMap.set(el.dataset.node as string, el))
    const clusterElMap = new Map<string, HTMLElement>()
    field
      .querySelectorAll<HTMLElement>('[data-cluster]')
      .forEach((el) => clusterElMap.set(el.dataset.cluster as string, el))
    const edgePathEls = Array.from(
      svg.querySelectorAll<SVGPathElement>('[data-edge]'),
    )
    const orbitEls = Array.from(
      svg.querySelectorAll<SVGEllipseElement>('[data-orbit]'),
    )
    const orbEls = Array.from(
      svg.querySelectorAll<SVGCircleElement>('[data-orb]'),
    )
    const pulseEls = Array.from(
      svg.querySelectorAll<SVGCircleElement>('[data-pulse]'),
    )
    const junctionEls = Array.from(
      svg.querySelectorAll<SVGCircleElement>('[data-junction]'),
    )

    const clusterOrder = new Map<ClusterId, number>()
    CATEGORIES.forEach((c, i) => clusterOrder.set(c.id, i))
    const nodeIndexInCluster = new Map<string, number>()
    const seen = new Map<ClusterId, number>()
    for (const n of TECHS) {
      const cat = CATEGORIES.find((c) => c.techs.includes(n.id))
      if (!cat) continue
      const k = seen.get(cat.id) ?? 0
      nodeIndexInCluster.set(n.id, k)
      seen.set(cat.id, k + 1)
    }

    // --- measured base geometry (recomputed only on real layout change) ----
    let W = 0
    let H = 0
    const base = new Map<string, { x: number; y: number }>()
    const coreBase = { x: 0, y: 0 }
    // The core's measured box (field-relative) so primary spokes can start at
    // its edge instead of running under the `</>` glyph.
    const coreBox = { x: 0, y: 0, w: 0, h: 0 }
    // Resolved orbit ellipses (px), used to place the orbs every frame.
    const orbitGeom: { rx: number; ry: number; rot: number }[] = []
    const measure = () => {
      W = field.clientWidth
      H = field.clientHeight
      if (W <= 0 || H <= 0) return
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
      base.clear()
      // Read true (un-offset) centres: clear the ambient transforms first so a
      // running loop's offsets can never be measured back into the base.
      nodeEls.forEach((el) => {
        if (el.style.transform) el.style.transform = ''
      })
      const fr = field.getBoundingClientRect()
      nodeEls.forEach((el) => {
        const r = el.getBoundingClientRect()
        base.set(el.dataset.node as string, {
          x: r.left - fr.left + r.width / 2,
          y: r.top - fr.top + r.height / 2,
        })
      })
      const cr = core.getBoundingClientRect()
      coreBox.x = cr.left - fr.left
      coreBox.y = cr.top - fr.top
      coreBox.w = cr.width
      coreBox.h = cr.height
      coreBase.x = coreBox.x + cr.width / 2
      coreBase.y = coreBox.y + cr.height / 2
      // The orbits are centred on the measured core (the hub), not on the field
      // centre, so they read as tilted orbital rings around the `</>` block.
      orbitEls.forEach((el, i) => {
        const o = ORBITS[i] ?? ORBITS[0]
        const rx = W * o.rx
        const ry = H * o.ry
        el.setAttribute('cx', coreBase.x.toFixed(1))
        el.setAttribute('cy', coreBase.y.toFixed(1))
        el.setAttribute('rx', rx.toFixed(1))
        el.setAttribute('ry', ry.toFixed(1))
        el.setAttribute(
          'transform',
          `rotate(${o.rot} ${coreBase.x.toFixed(1)} ${coreBase.y.toFixed(1)})`,
        )
        orbitGeom[i] = { rx, ry, rot: (o.rot * Math.PI) / 180 }
      })
    }

    // --- shared ambient loop ----------------------------------------------
    const offsets = new Map<string, { x: number; y: number }>()
    const ptX = (id: string) =>
      (id === 'core' ? coreBase.x : base.get(id)?.x ?? 0) +
      (offsets.get(id)?.x ?? 0)
    const ptY = (id: string) =>
      (id === 'core' ? coreBase.y : base.get(id)?.y ?? 0) +
      (offsets.get(id)?.y ?? 0)

    // --- curved-path helpers ----------------------------------------------
    // Primary spokes leave the core at its measured edge (plus a small gap) so
    // no connector ever crosses the `</>` glyph. Both primaries and secondary
    // cross-links are cubic Béziers whose two control points share one
    // perpendicular bow, so pulses and junction beads ride the real curve.
    const CORE_GAP = 6
    const coreExit = (tx: number, ty: number) => {
      let dx = tx - coreBase.x
      let dy = ty - coreBase.y
      const len = Math.hypot(dx, dy) || 1
      dx /= len
      dy /= len
      const hx = coreBox.w / 2 + CORE_GAP
      const hy = coreBox.h / 2 + CORE_GAP
      const tX = Math.abs(dx) > 1e-4 ? hx / Math.abs(dx) : Infinity
      const tY = Math.abs(dy) > 1e-4 ? hy / Math.abs(dy) : Infinity
      const t = Math.min(tX, tY)
      return { x: coreBase.x + dx * t, y: coreBase.y + dy * t }
    }

    type EdgeGeom = {
      x1: number
      y1: number
      x2: number
      y2: number
      c1x: number
      c1y: number
      c2x: number
      c2y: number
    }
    const edgeGeom: EdgeGeom[] = []
    const edgeIndex = new Map<string, number>()
    EDGES.forEach((e, i) => {
      edgeIndex.set(`${e[0]}|${e[1]}`, i)
      edgeIndex.set(`${e[1]}|${e[0]}`, i)
    })

    const buildEdgeGeom = (
      e: readonly [string, string],
      ei: number,
    ): EdgeGeom => {
      const primary = e[0] === 'core' || e[1] === 'core'
      let ax: number
      let ay: number
      let bx: number
      let by: number
      if (primary) {
        const other = e[0] === 'core' ? e[1] : e[0]
        const exit = coreExit(ptX(other), ptY(other))
        ax = exit.x
        ay = exit.y
        bx = ptX(other)
        by = ptY(other)
      } else {
        ax = ptX(e[0])
        ay = ptY(e[0])
        bx = ptX(e[1])
        by = ptY(e[1])
      }
      const dx = bx - ax
      const dy = by - ay
      const len = Math.hypot(dx, dy) || 1
      const nx = -dy / len
      const ny = dx / len
      // Primaries share one swirl direction (an engineered vortex); secondary
      // cross-links alternate, so the network has more than one curvature.
      const sign = primary ? 1 : ei % 2 === 0 ? 1 : -1
      const bow =
        sign * Math.min(primary ? 44 : 26, len * (primary ? 0.15 : 0.1))
      const ox = nx * bow
      const oy = ny * bow
      return {
        x1: ax,
        y1: ay,
        x2: bx,
        y2: by,
        c1x: ax + dx * 0.34 + ox,
        c1y: ay + dy * 0.34 + oy,
        c2x: ax + dx * 0.66 + ox,
        c2y: ay + dy * 0.66 + oy,
      }
    }

    const edgePath = (g: EdgeGeom) =>
      `M${g.x1.toFixed(1)} ${g.y1.toFixed(1)} C${g.c1x.toFixed(1)} ${g.c1y.toFixed(1)} ${g.c2x.toFixed(1)} ${g.c2y.toFixed(1)} ${g.x2.toFixed(1)} ${g.y2.toFixed(1)}`

    const cubicAt = (g: EdgeGeom, t: number) => {
      const mt = 1 - t
      const a = mt * mt * mt
      const b = 3 * mt * mt * t
      const c = 3 * mt * t * t
      const d = t * t * t
      return {
        x: a * g.x1 + b * g.c1x + c * g.c2x + d * g.x2,
        y: a * g.y1 + b * g.c1y + c * g.c2y + d * g.y2,
      }
    }

    let running = false
    let raf = 0
    let elapsed = 0
    let lastNow = 0
    let activeFlag = false
    // Written by the scroll-driven entrance, read by the loop.
    let coreReveal = 0

    const writeFrame = (t: number) => {
      TECHS.forEach((n, i) => {
        const ax = 2 + (i % 3) * 0.7
        const ay = 2 + ((i + 1) % 3) * 0.7
        const fx = 0.05 + (i % 5) * 0.013
        const fy = 0.06 + (i % 4) * 0.017
        const dx = ax * Math.sin(2 * Math.PI * fx * t + i * 2.399)
        const dy = ay * Math.sin(2 * Math.PI * fy * t + i * 1.7)
        const el = nodeElMap.get(n.id)
        if (el) el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`
        offsets.set(n.id, { x: dx, y: dy })
      })
      offsets.set('core', { x: 0, y: 0 })

      EDGES.forEach((e, ei) => {
        const g = buildEdgeGeom(e, ei)
        edgeGeom[ei] = g
        const path = edgePathEls[ei]
        if (path) path.setAttribute('d', edgePath(g))
      })

      PULSES.forEach((e, pi) => {
        const c = pulseEls[pi]
        if (!c) return
        const gi = edgeIndex.get(`${e[0]}|${e[1]}`)
        const g = gi === undefined ? undefined : edgeGeom[gi]
        if (!g) return
        const tau = (t * (0.11 + pi * 0.017) + pi * 0.13) % 1
        const p = cubicAt(g, tau)
        c.setAttribute('cx', p.x.toFixed(1))
        c.setAttribute('cy', p.y.toFixed(1))
        c.style.opacity = (Math.sin(Math.PI * tau) * 0.9).toFixed(2)
      })

      // Junction beads sit on the real curve (t = 0.5) of their cross-link, so
      // they track the ambient node motion without extra reads.
      JUNCTIONS.forEach((e, ji) => {
        const c = junctionEls[ji]
        if (!c) return
        const gi = edgeIndex.get(`${e[0]}|${e[1]}`)
        const g = gi === undefined ? undefined : edgeGeom[gi]
        const mx = g ? cubicAt(g, 0.5).x : (ptX(e[0]) + ptX(e[1])) / 2
        const my = g ? cubicAt(g, 0.5).y : (ptY(e[0]) + ptY(e[1])) / 2
        c.setAttribute('cx', mx.toFixed(1))
        c.setAttribute('cy', my.toFixed(1))
      })

      // Orbs drift along the tilted orbit rings: a point on the unrotated
      // ellipse, then rotated by the ring's tilt around the core centre.
      ORBS.forEach((o, oi) => {
        const el = orbEls[oi]
        const g = orbitGeom[o.orbit]
        if (!el || !g) return
        const th = ((o.a + o.s * t) * Math.PI) / 180
        const ex = g.rx * Math.cos(th)
        const ey = g.ry * Math.sin(th)
        const x = coreBase.x + ex * Math.cos(g.rot) - ey * Math.sin(g.rot)
        const y = coreBase.y + ex * Math.sin(g.rot) + ey * Math.cos(g.rot)
        el.setAttribute('cx', x.toFixed(1))
        el.setAttribute('cy', y.toFixed(1))
      })

      core.style.opacity = (
        coreReveal *
        (0.9 + 0.1 * Math.sin(2 * Math.PI * 0.07 * t))
      ).toFixed(3)
    }

    const frame = (now: number) => {
      if (!running) return
      if (lastNow) elapsed += (now - lastNow) / 1000
      lastNow = now
      writeFrame(elapsed)
      raf = requestAnimationFrame(frame)
    }

    const startLoop = () => {
      if (running || reduced) return
      if (W <= 0 || H <= 0) measure()
      running = true
      lastNow = 0
      raf = requestAnimationFrame(frame)
    }
    const stopLoop = () => {
      if (!running) return
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      lastNow = 0
      offsets.clear()
      for (const n of TECHS) {
        const el = nodeElMap.get(n.id)
        if (el) el.style.transform = ''
      }
    }

    // --- scroll-driven entrance -------------------------------------------
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
    const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3)
    const lo = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
    const r2 = (v: number) => Math.round(v * 100) / 100

    let lastProgress = 0

    const apply = (p: number) => {
      lastProgress = p
      const active = p >= EXPERTISE_START
      activeFlag = active
      if (section) section.classList.toggle('expertise--active', active)

      for (const n of TECHS) {
        const el = nodeElMap.get(n.id)
        if (!el) continue
        const cat = CATEGORIES.find((c) => c.techs.includes(n.id))
        const j = cat ? clusterOrder.get(cat.id) ?? 0 : 0
        const k = nodeIndexInCluster.get(n.id) ?? 0
        const s = 0.07 * j + 0.025 * k
        const e = Math.min(1, s + 0.2)
        const t = easeOut(lo(p, EXPERTISE_START + s * EW, EXPERTISE_START + e * EW))
        el.style.opacity = t <= 0 ? '0' : String(r2(t))
      }

      for (const c of CATEGORIES) {
        const el = clusterElMap.get(c.id)
        if (!el) continue
        const j = clusterOrder.get(c.id) ?? 0
        const s = 0.07 * j
        const e2 = Math.min(1, s + 0.18)
        const t = easeOut(lo(p, EXPERTISE_START + s * EW, EXPERTISE_START + e2 * EW))
        el.style.opacity = t <= 0 ? '0' : String(r2(t))
      }

      coreReveal = easeOut(lo(p, EXPERTISE_START + 0.02 * EW, EXPERTISE_START + 0.35 * EW))
      const wireReveal = easeOut(
        lo(p, EXPERTISE_START + 0.06 * EW, EXPERTISE_START + 0.55 * EW),
      )
      if (reduced) {
        core.style.opacity = coreReveal <= 0 ? '0' : '1'
        svg.style.opacity = wireReveal <= 0 ? '0' : '1'
        // Draw the connector geometry once, statically (no rAF in this mode):
        // the network stays coherent without any continuous motion.
        if (coreReveal > 0) writeFrame(0)
      } else {
        svg.style.opacity = wireReveal <= 0 ? '0' : String(r2(wireReveal))
        if (!running) core.style.opacity = coreReveal <= 0 ? '0' : String(r2(coreReveal * 0.94))
      }

      const shouldRun =
        !reduced &&
        !phone.matches &&
        active &&
        document.visibilityState === 'visible'
      if (shouldRun) startLoop()
      else if (running) stopLoop()
    }

    const onVisibility = () => {
      if (reduced) return
      if (document.visibilityState === 'visible' && activeFlag && !running) {
        startLoop()
      } else if (document.visibilityState !== 'visible' && running) {
        stopLoop()
      }
    }

    measure()
    const remeasure = () => {
      measure()
      if (running) writeFrame(elapsed)
      else if (reduced) writeFrame(0)
    }

    window.addEventListener('resize', remeasure)
    document.addEventListener('visibilitychange', onVisibility)
    document.fonts?.ready.then(remeasure).catch(() => {})
    // A resize across the phone breakpoint must re-state the ambient gate
    // immediately (the cached progress makes the switch deterministic).
    const onPhoneChange = () => {
      remeasure()
      apply(lastProgress)
    }
    phone.addEventListener('change', onPhoneChange)

    const unsubscribe = subscribeScrollProgress(apply)

    return () => {
      unsubscribe()
      window.removeEventListener('resize', remeasure)
      document.removeEventListener('visibilitychange', onVisibility)
      phone.removeEventListener('change', onPhoneChange)
      stopLoop()
      for (const n of TECHS) {
        const el = nodeElMap.get(n.id)
        if (el) {
          el.style.opacity = ''
          el.style.transform = ''
        }
      }
      for (const c of CATEGORIES) clusterElMap.get(c.id)?.style.removeProperty('opacity')
      core.style.opacity = ''
      svg.style.opacity = ''
    }
  }, [EW])

  return (
    <section
      className="expertise"
      ref={sectionRef}
      aria-label="Expertise"
      // MOBILE: while the narrow inner-scroll layout is active (768–900px,
      // the stacked band) the scene is its own scroll region, so Lenis must
      // not hijack the wheel over it — the attribute makes the scene native
      // (inner content scrolls and chains to the page at its edges), while
      // the touch path is native already (smoothScroll's smoothTouch: false).
      // On the desktop, where the scene has no overflow, and on PHONES,
      // where the six-panel track presentation has no inner scroll at all,
      // removing the attribute keeps Lenis owning the film exactly as
      // before.
      data-lenis-prevent={stackedField && !phoneTrack ? '' : undefined}
    >
      <div className="expertise__left">
        <div className="expertise__clip">
          <div className="expertise__slide" ref={b1Ref}>
            <div className="expertise__text-group">
              <div className="expertise__meta">
                <span className="expertise__num">01</span>
                <span className="expertise__label">MY TECH STACK</span>
              </div>
              <h2 className="expertise__headline">
                <span>Modern tools.</span>
                <span>Real skills.</span>
                <span className={ACCENT}>Practical websites.</span>
              </h2>
              <p className="expertise__para">
                I use a focused set of modern technologies to design and develop
                high-performance, scalable and visually appealing websites. Each
                tool plays a specific role in creating clean, maintainable and
                effective solutions for real business needs.
              </p>
            </div>
          </div>
        </div>

        <div className="expertise__clip">
          <div className="expertise__slide" ref={tilesRef}>
            <div className="expertise__principles">
              {PRINCIPLES.map((p) => (
                <div className="expertise__principle" key={p.id}>
                  <span className="expertise__principle-icon" aria-hidden="true">
                    {PRINCIPLE_ICONS[p.id]}
                  </span>
                  <h3 className="expertise__principle-title">{p.title}</h3>
                  <p className="expertise__principle-text">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="expertise__clip">
          <div className="expertise__slide" ref={b2Ref}>
            <div className="expertise__text-group expertise__text-group--last">
              <div className="expertise__meta">
                <span className="expertise__num">02</span>
                <span className="expertise__label">WHAT THIS MEANS FOR YOU</span>
              </div>
              <h2 className="expertise__headline">
                <span>Better websites.</span>
                <span className={ACCENT}>Measurable results.</span>
              </h2>
              <p className="expertise__para">
                These technologies help me build fast, responsive and scalable
                websites that look good, work smoothly, and support your
                business goals&mdash;from first impression to real user action.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="expertise__right">
        <div className="expertise__heading">
          <span className="expertise__heading-num">03</span>
          <span className="expertise__heading-label">TECHNOLOGIES I USE</span>
        </div>

        <div className="expertise__stage">
          <div className="expertise__field" ref={fieldRef}>
            <svg
              className="expertise__wires"
              ref={svgRef}
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              {ORBITS.map((_, i) => (
                <ellipse
                  key={`o${i}`}
                  className="expertise__orbit"
                  data-orbit={i}
                />
              ))}
              {EDGES.map((e, i) => (
                <path
                  key={`e${i}`}
                  className="expertise__wire"
                  data-edge={i}
                  data-primary={e[0] === 'core' ? 'true' : 'false'}
                />
              ))}
              {JUNCTIONS.map((_, i) => (
                <circle
                  key={`j${i}`}
                  className="expertise__junction"
                  data-junction={i}
                  cx={-100}
                  cy={-100}
                  r={2.6}
                />
              ))}
              {ORBS.map((_, i) => (
                <circle
                  key={`b${i}`}
                  className="expertise__orb"
                  data-orb={i}
                  cx={-100}
                  cy={-100}
                  r={3.4}
                />
              ))}
              {PULSES.map((e, i) => (
                <circle
                  key={`p${i}`}
                  className="expertise__pulse"
                  data-pulse={i}
                  r={2.4}
                />
              ))}
            </svg>

            <div
              className="expertise__core"
              ref={coreRef}
              style={
                stackedField
                  ? undefined
                  : {
                      left: `${CORE.x}%`,
                      top: `${CORE.y}%`,
                      width: `${CORE.w}%`,
                      height: `${CORE.h}%`,
                    }
              }
            >
              <span className="expertise__core-back" aria-hidden="true" />
              <span className="expertise__core-plane" aria-hidden="true" />
              <span className="expertise__core-face" aria-hidden="true" />
              <span className="expertise__core-glyph">{`</>`}</span>
            </div>

            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="expertise__cat"
                data-cluster={cat.id}
                style={
                  stackedField
                    ? undefined
                    : {
                        left: `${cat.x}%`,
                        top: `${cat.y}%`,
                        width: `${cat.w}%`,
                        height: `${cat.h}%`,
                      }
                }
              >
                <div className="expertise__cat-head">
                  <span className="expertise__cat-label">{cat.label}</span>
                  <span className="expertise__cat-desc">{cat.description}</span>
                </div>
                <div className="expertise__cat-tiles">
                  {cat.techs.map((tid) => {
                    const t = getTech(tid)
                    return (
                      <div key={t.id} className="expertise__tile" data-node={t.id}>
                        <img
                          className="expertise__tile-logo"
                          src={t.logo}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                        />
                        <span className="expertise__tile-name">{t.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="expertise__workflow">
        <div className="expertise__wf-head">
          <h3 className="expertise__wf-title">Real-World Use Cases</h3>
          <p className="expertise__wf-sub">
            How these tools can work together in a typical project.
          </p>
        </div>
        <ol className="expertise__wf-stages">
          {WORKFLOW.map((s, i) => {
            const t = getTech(s.tech)
            return (
              <Fragment key={s.id}>
                {i > 0 && (
                  <li className="expertise__wf-arrow" aria-hidden="true" />
                )}
                <li className="expertise__wf-stage">
                  <img
                    className="expertise__wf-mark"
                    src={t.logo}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                  />
                  <span className="expertise__wf-text">
                    <span className="expertise__wf-label">{s.label}</span>
                    <span className="expertise__wf-tool">{s.tool}</span>
                  </span>
                </li>
              </Fragment>
            )
          })}
        </ol>
      </div>

      <div className="expertise__xrail" aria-hidden="true">
        <span className="expertise__xrail-line" />
        <ol className="expertise__xrail-list">
          {RAIL_ITEMS.map((label, i) => (
            <li
              key={label}
              className="expertise__xrail-item"
              data-state={i === 0 ? 'active' : 'idle'}
            >
              <span className="expertise__xrail-label">{label}</span>
              <span className="expertise__xrail-dot" />
            </li>
          ))}
        </ol>
      </div>

      {/* MOBILE PANELS (<= 767px) — the six sequential compositions from the
          task spec, laid out by responsive/expertise-mobile.css as ONE
          horizontal track (grid of six viewport-wide columns) that
          <ExpertiseMobileTrack /> translates from the shared cinematic
          progress. Always mounted, never painted above 767px (the base
          `.expertise-mobile { display: none }`), so a breakpoint crossing
          never remounts content — and the phone-band subtrees above (left
          lane, field, workflow strip) are simply not part of the phone
          presentation; the mobile copy carries the authorized composition.

          The exit choreography translates the `.expertise-mobile` VIEWPORT
          (transform) while the track driver writes the CSS `translate`
          property on `.expertise-mobile__track` — different elements, so
          the two systems compose and never overwrite each other. The
          fixed interface (header chrome, navbar) is a sibling above this
          tree and inherits no part of the horizontal movement. */}
      <div className="expertise-mobile">
        <div className="expertise-mobile__track">
          <ExpertisePhonePanels />
        </div>
      </div>
      {/* The phone-band track driver (<= 767px only) — placed after the
          panels so it can never race any other system for the same element:
          this component only writes the CSS `translate` of the track and
          subscribes to the same shared progress bus. */}
      <ExpertiseMobileTrack />
    </section>
  )
}
