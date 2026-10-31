# packages/3d-engine

Status: planned (R1 Monument). Nothing is built here yet.

Rendering and picking for the monument: four passes (solid, translucent, wireframe slots, sponsor
posters), the compiled-manifest reader, the camera paths along the Grand Stairways and the
picking technique chosen in [ADR-0009](../../docs/decisions/0009-picking-and-transparency.md).

Rules that apply from day one:

- At most 4 draw calls and no per-frame allocation. Dispose of geometry and textures.
- Sponsor data must never be imported by picking, layout, search or scoring code.
- Every capability needs an accessible equivalent in the Architect Table View.

A benchmark spike (50,000 bricks, mid-range phone) comes first. Good first contribution: build the
benchmark harness.
