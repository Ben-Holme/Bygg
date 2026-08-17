# Bygg — Parametric Deck Planner

A three.js scene for planning wooden deck construction. Every position and
distance in the scene is calculated from a set of parameters, editable live
in the on-screen panel.

## Current scene

A short, wide, parametric staircase, built on its own foundation:

- Two parallel foundation beams (default a 4×12cm bearer, 5m long — the wide
  dimension), already installed flat at ground level, spaced apart (default
  100cm centre-to-centre — the short climbing run) and centred on the origin.
- Bottom joists rest flush across the full width, evenly spaced (count is a
  parameter) and resting directly on the two beams — this is the seating.
  A fixed 4-step staircase is cut into the middle, spanning some number of
  those joist bays (width is a parameter), climbing across the short gap
  between the beams from the ground up to a total height (parameter) —
  joists stay perpendicular to the beams throughout, as they should.
- A construction post at each end of every step, automatically sized to
  carry its load straight down to the foundation beam beneath it.
- Live dimension labels showing computed spacing, rise, and width.
- A ground grid for scale reference.

## Controls

- Drag to rotate, scroll or pinch to zoom, right-drag (or two-finger drag) to pan.
- Press `P` or click the ☰ button (top-right) to toggle the parameter panel.
- "reset view" in the panel re-frames the camera to fit the current geometry.

## Units

The scene works in millimetres internally. Following common timber
cut-list convention, cross-section dimensions (width/height) are entered in
centimetres and lengths/spacings in millimetres — all fully editable.

## Development

```sh
npm install
npm run dev      # start dev server
npm run build    # production build
```
