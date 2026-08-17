# Bygg — Parametric Deck Planner

A three.js scene for planning wooden deck construction. Every position and
distance in the scene is calculated from a set of parameters, editable live
in the on-screen panel.

## Current scene

- Two post cubes, spaced apart (default 100cm) and centred on the origin.
- A foundation beam (default a 120×40mm bearer, 5m long) resting on the ground.
- Live dimension labels showing computed spacing/length.
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
