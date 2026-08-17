# Bygg — Parametric Deck Planner

A three.js scene for planning wooden deck construction. Every position and
distance in the scene is calculated from a set of parameters, editable live
in the on-screen panel.

## Current scene

A parametric staircase, built on its own foundation:

- Two parallel foundation beams (default a 4×12cm bearer, 5m long), already
  installed flat at ground level, spaced apart (default 100cm centre-to-centre)
  and centred on the origin — these are the footing for the stair, not a deck.
- One continuous rising structure climbing along the beams' length, sharing
  uniform risers throughout, but split into two different things: a real
  staircase in the middle (small-tread steps, count is a parameter) for
  walking, flanked by two wide sitting platforms (2 large-tread steps each
  side) — not a walking flight, just deep enough to sit on. Total rise is
  a parameter.
- A construction post at each end of every step, automatically sized to
  carry that step's load straight down to the foundation beam beneath it.
- Live dimension labels showing computed spacing, rise, and run.
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
