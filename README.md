# Bygg — Parametric Deck Planner

A three.js scene for planning wooden deck construction. Every position and
distance in the scene is calculated from a set of parameters, editable live
in the on-screen panel.

## Current scene

- Two parallel foundation beams (default a 120×40mm bearer, 5m long),
  spaced apart (default 100cm centre-to-centre) and centred on the origin.
- A layer of joists (crossing beams) on top, running perpendicular to the
  foundation beams and evenly spaced along their length. The joist count is
  a parameter; they always sit flush on top of the foundation beams and
  span the full width between their outer edges.
- Live dimension labels and a dashed spacing line showing computed distances.
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
