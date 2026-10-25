/**
 * LAYER 3 — the portfolio UI layer.
 *
 * The mount point every UI piece renders into. Step 2 adds the Navbar; later
 * steps add hero, editorial, trust and signature.
 *
 * Constraints encoded here so they are not re-litigated later:
 *  - Fixed and full-bleed, so it sits out of document flow and cannot
 *    shorten the ~600vh scroll distance the pinned canvas depends on.
 *  - pointer-events: none on the layer itself, so wheel, touch and pointer
 *    events always reach Lenis and the frame engine underneath. Only the
 *    interactive elements inside opt back in, with .ui-layer--interactive —
 *    the layer is never made wholesale interactive.
 *  - It must never contain a transform, filter or will-change on itself, as
 *    that would create a containing block for its own fixed descendants.
 */
export function UIOverlay({ children }: { children?: React.ReactNode }) {
  return (
    <div className="ui-layer" data-layer="ui">
      {children}
    </div>
  )
}
