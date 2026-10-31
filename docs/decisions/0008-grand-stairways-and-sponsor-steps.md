# ADR-0008: Grand Stairways and Sponsor Steps

Status: Proposed | Date: 2026-11-01 | Deciders: founder | Related: PLAN_REVIEW F-25, constitution principle IX

## Context

The founder wants visitors to navigate to bricks by climbing steps on the monument, and wants those
steps to carry the posters or logos of companies that fund the project, so GitPyramid can stay open
source and may earn something. A stepped ziggurat already looks like a staircase, so the idea fits.
The risk is trust: a registry that can be paid for is worthless.

## Decision

- Each sector gets a **Grand Stairway**: a channel carved through the shell with one tread per
  layer. Groups of treads form **landings**, one per category, where the camera pauses. The count
  and place of stairways follow the sector geometry decision (OQ-01).
- Stairs are the **navigation spine**: sector, then category, then brick. Search and deep links use
  the same path. Reduced motion and the Table View replace the animation.
- The vertical face of a tread, the **riser**, can carry a **Sponsor Step** poster. Placements are
  Capstone Patron, Sector Patron, Step Sponsor and Founding Step. Unsold steps show plain stone.
- Posters are produced by our build from sponsor logos onto a standard plate, 512 by 256 WebP, at
  most 16 KB each, in an atlas of at most 512 KB loaded after first render, drawn in **one extra
  draw call** (budget goes from 3 to 4).
- **Firewall.** Constitution principle IX applies in full: sponsor data never feeds scoring, layout,
  search or AI output. A test asserts that the compiled brick manifest is identical with and without
  sponsors. Sponsors are labeled, listed publicly, and tracked only by first-party aggregate counts.
- Stair and plate cells are reserved and never given to bricks. Stairs cost about 5% to 13% of an
  Epoch I shell depending on depth.
- Default builds and forks render placeholders. Real logos load only in the official deployment.

## Alternatives considered

- DOM banner ads over the canvas: break immersion, block navigation, need third-party scripts.
- Sponsor bricks in the monument: look like registry endorsements. Rejected.
- Paid ranking or "featured" bricks: destroys trust. Rejected permanently.
- Sponsor-supplied final images: allow UI imitation and heavy files. The build makes the pixels.

## Consequences

One more build stage and one more draw call. Sponsor sales need real traffic numbers, so the
program opens after launch metrics exist. Founding Steps can be sold earlier at a low flat rate.
The legal and tax steps in `docs/SPONSORSHIP.md` apply before the first payment.
