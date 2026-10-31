# ADR-0004: Stable slots and the append-only ledger

Status: Proposed | Date: 2026-11-01 | Deciders: founder | Related: PLAN_REVIEW F-02, F-03, F-06, F-07, F-08

## Context

The plan sizes bricks from a live score and stores coordinates in manifests. That makes bricks move
when scores change, makes parallel pull requests collide, and breaks shared links. It also leaves
open how many bricks fit, where the fifth sector goes, and how layers are numbered.

## Decision

- **Ids** are assigned at admission from a counter (`#0001` is the foundation brick) and are never
  reused. A retired brick keeps its id.
- **Size and position are fixed at admission.** Size comes from the score at that moment. Live
  metrics change color, opacity and labels only.
- **The monument is pre-partitioned into typed slots** of 1, 2, 4 and 8 cells, in planned
  proportions per sector and category band. Admission takes the next free slot of the brick's size
  class. If a band is full it falls back to the sector's annex, then to an overflow queue.
- **Epochs.** A monument has a fixed size chosen at creation. When it is full, a new connected
  structure begins. Re-tiering and quota changes happen only at an Epoch boundary, as a reviewed
  migration with a public diff.
- **Layers are numbered from the base.** Brick #0001 sits at the center of the base.
- **The lattice** (unit-step, odd-side or another) and the **sector geometry** (OQ-01) are decided in
  the layout spec before any coordinate is published. Recommendation for sectors: four faces for
  four sectors and the atrium for the fifth.

## Alternatives considered

- Positions derived from sorted order: inserting a brick shifts everyone.
- Score-driven size with in-place growth: collisions and moving links.
- Contributor-chosen coordinates: merge conflicts and abuse.
- Packing bricks at admission time: fragmentation, and a different layout depending on order.

## Consequences

The monument can show true empty slots, which is the call to action. Maintainers must set category
quotas. A brick whose score later changes tier keeps its slot until the next Epoch. Capacity per
Epoch is fixed, so growth needs the Epoch process.
