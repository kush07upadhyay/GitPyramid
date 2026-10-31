# ADR-0009: Picking and transparency

Status: Proposed, spike required | Date: 2026-11-01 | Deciders: founder, 3D lead | Related: PLAN_REVIEW F-12, F-13

## Context

The plan picks bricks with `three-mesh-bvh` and draws translucent bricks with `alphaHash`.
`three-mesh-bvh` speeds up raycasts against triangles of a geometry and supports several mesh types,
but it does not remove the per-instance loop inside three.js `InstancedMesh`. `alphaHash` is a
stochastic effect with visible grain that temporal anti-aliasing reduces.

## Decision

Choose by measurement, not by plan. Build a spike with 50,000 bricks and compare candidates.

**Picking candidates**

1. Voxel-grid ray march over an occupancy grid that stores the brick id per occupied cell. Cost is
   proportional to the ray length in cells, it is deterministic and needs no library.
2. The instance BVH from `@three.ez/instanced-mesh`, wrapped behind a small interface because it
   has a single maintainer.
3. GPU color-id picking: render ids to a small target and read one pixel.

**Transparency candidates**

1. Per-instance opacity with instance sorting and depth writes off for that pass.
2. A deterministic ordered dither in the fragment shader (no randomness, stable between frames).
3. `alphaHash` with temporal anti-aliasing.
4. No blending: a lighter tint and glowing edges to signal "rising".

**Acceptance on a mid-range phone:** pointer pick under 4 ms at the 95th percentile, no per-frame
allocation, 60 FPS with 50,000 bricks, and four draw calls in total.

## Alternatives considered

Keep the plan as written. It risks a slow picker and a grainy look discovered late.

## Consequences

A short, early spike inside the viewport spec. The result is recorded as a new ADR that supersedes
this one.
