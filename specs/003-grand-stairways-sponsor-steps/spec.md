# Feature Specification: Grand Stairways and Sponsor Steps

**Feature Branch**: `003-grand-stairways-sponsor-steps`
**Created**: 2026-11-01
**Status**: Draft. Nothing here is implemented. The plan and tasks follow after the layout spec (OQ-01, OQ-02) and the viewport spec (OQ-05) are accepted, because the stair geometry and the renderer decide them.
**Input**: the founder's add-on request, [ADR-0008](../../docs/decisions/0008-grand-stairways-and-sponsor-steps.md), [SPONSORSHIP](../../docs/SPONSORSHIP.md), [PRD](../../docs/PRD.md) requirements STAIR-1 to STAIR-3 and SPN-1 to SPN-6, constitution principles IV, VI, VII and IX.

> **The rule that outranks everything in this file:** sponsors fund the stairs, contributors build the
> walls. Sponsor data is never an input to which bricks exist, or to a brick's score, size, state,
> position, search rank or AI answer (constitution principle IX). Any requirement below that seems to
> conflict with that sentence is a bug in this spec.

## Scope by release

| Part | Release | PRD |
| :--- | :--- | :--- |
| Stair cells reserved in the layout, plain stone treads, navigation, landings, keyboard path | R1 | STAIR-1 to STAIR-3 |
| Sponsor schema, build pipeline, poster pass, labels, `/sponsors`, reporting, isolation, placeholders | R3 | SPN-1 to SPN-6 |

The first part ships with no sponsor code at all. The second part can be built later without changing
the first, because posters only decorate risers that already exist.

## User Scenarios and Testing

### User Story 1 - A visitor climbs to a brick (Priority: P1, R1)

A visitor opens the monument, picks a sector, climbs its Grand Stairway to the landing for a
category, and opens a brick.

**Why this priority**: it is how most visitors will find things, and it is the product's signature
interaction. It must work with no sponsor present.

**Independent Test**: with sponsors disabled, reach every brick in the registry using only the stair
path and a keyboard.

**Acceptance Scenarios**:

1. **Given** the monument, **When** the visitor selects a sector, **Then** the camera flies along that
   sector's stairway and pauses at the first landing.
2. **Given** a landing, **When** the visitor selects a category, **Then** the camera shows that
   category's bricks and the brick list is available as text.
3. **Given** a search result or a deep link `/brick/<owner>/<repo>`, **When** opened, **Then** the
   view focuses on the brick directly with no tour, and the stair path to it is still one key away.
4. **Given** any animation, **When** the visitor taps or presses a key, **Then** it skips to the end.

### User Story 2 - A visitor who cannot use the 3D view still gets everything (Priority: P1, R1)

**Independent Test**: with no pointing device and a screen reader, reach a brick, then repeat with
reduced motion on and with images blocked.

**Acceptance Scenarios**:

1. **Given** reduced motion, **When** a tour would play, **Then** it is an instant jump with a short
   cross-fade.
2. **Given** the keyboard, **When** the visitor presses up or down, **Then** focus moves between
   landings. Left or right switches stairways, Enter opens a category and Escape leaves stair mode.
3. **Given** a screen reader, **When** it reads the Table View, **Then** sponsors appear once, in a
   labeled "Sponsors" region, and never between bricks.
4. **Given** images blocked or a text-only browser, **When** a poster would show, **Then** its
   required alt text is available and the sponsor is listed as text.

### User Story 3 - A maintainer places a sponsor without touching bricks (Priority: P1, R3)

A maintainer adds `sponsors/<slug>.json` and a logo file, opens a pull request, and after review the
next build shows a labeled poster on the assigned steps.

**Independent Test**: build twice, with and without the sponsor folder. The compiled brick data must
be byte-identical.

**Acceptance Scenarios**:

1. **Given** a valid sponsor file and logo, **When** the site is built, **Then** a poster appears on
   the assigned riser, labeled "Sponsor", and the sponsor is listed on `/sponsors`.
2. **Given** an invalid logo (script in an SVG, an animated image, a file that is too large), **When**
   the site is built, **Then** the build fails with a message that names the file and the rule.
3. **Given** a term that has ended, **When** the site is built, **Then** the step is plain stone again.
4. **Given** a sponsor folder that is empty, **When** the site is built, **Then** every riser shows
   engraved stone and nothing breaks.

### User Story 4 - A sponsor gets honest numbers (Priority: P2, R3)

**Independent Test**: simulate sessions with Do Not Track, with Global Privacy Control and without
either. Check what the endpoint stores.

**Acceptance Scenarios**:

1. **Given** a poster that is at least 30% on screen for a second, **When** the session ends, **Then**
   one summary per session adds one view to that placement for that date.
2. **Given** Do Not Track or Global Privacy Control, **When** the session ends, **Then** nothing is
   sent.
3. **Given** the stored data, **When** inspected, **Then** it holds only a placement id, a date and a
   count. No cookie, user id or IP address.

### User Story 5 - A fork or a local build shows no one's trademark (Priority: P2, R3)

**Independent Test**: build without the official-deployment flag and check the output for any sponsor
asset.

**Acceptance Scenarios**:

1. **Given** a default build, **When** it renders, **Then** every sponsor step shows a neutral
   placeholder, not the real logo.
2. **Given** the official deployment flag, **When** it renders, **Then** real art loads.

## Edge Cases

Every row maps to a planned test, named here so the plan can schedule it. "Decision" means the case
is settled in writing and has no test.

### Navigation and accessibility (R1)

| Case | Behavior | Planned test |
| :--- | :--- | :--- |
| A category with no bricks yet | Its landing shows the empty wireframe slots and a call to add one | `stairs: empty category landing` |
| A category with more bricks than fit in view | The landing pages them. Every brick stays reachable by keyboard | `stairs: every brick reachable by keyboard` |
| The last layer of a stairway | There is no step beyond it. Pressing up does nothing and says so | `stairs: no step past the top` |
| A sector with one category | One landing. Left and right still switch stairways | `stairs: single landing sector` |
| Fast repeated key presses during a tour | The tour skips to its end. Nothing queues | `stairs: tour skip is idempotent` |
| Browser back button after a tour | Returns to the previous focus, not to an intermediate camera pose | `stairs: history matches focus` |
| Deep link to a brick that is retired | A clear "retired" page with the id and the reason. No blank view | `stairs: retired brick deep link` |
| Deep link to an unknown id | A 404 page that links to the search | `stairs: unknown brick deep link` |
| Reduced motion | Instant jump with a short cross-fade | `a11y: reduced motion` |
| Focus after leaving stair mode with Escape | Returns to where the visitor was, never lost on the page | `a11y: focus is restored` |
| Screen reader reads the Table View | Sponsors appear once in their own labeled region, never between bricks | `a11y: sponsors never between bricks` |
| Images blocked or text-only browser | Alt text and a text listing are present | `a11y: poster alt text` |
| Contrast of labels and focus rings on the stone and plates | WCAG 2.2 AA | `a11y: contrast` |
| A device that fails the capability check | Table View by default, with a link to try 3D | Decision, covered by the viewport spec |
| A brick below a stair cell or on a landing | Impossible. Stair cells are reserved in the layout | `layout: no brick in a stair cell` (STAIR-1) |

### Sponsor data and the build (R3)

| Case | Behavior | Planned test |
| :--- | :--- | :--- |
| `slug` with capitals, spaces, dots or a path | Rejected. The slug is the file name | `sponsor-schema: slug` |
| A name, text or alt text with hidden, bidirectional or control characters, links, markup, prices, countdowns or calls to action | Rejected, with the offending character named | `sponsor-schema: text safety` |
| A line of text over 40 characters, alt text over 80 | Rejected | `sponsor-schema: limits` |
| A link that is not HTTPS, has credentials, points at an IP address or a shortener | Rejected | `sponsor-schema: link` |
| Missing alt text | Rejected | `sponsor-schema: alt required` |
| Term end before term start, impossible dates, a term that has not started yet, a term that has ended | Rejected, stone until it starts, stone after it ends. Dates are UTC | `sponsor-schema: term` |
| Two sponsors on the same step on overlapping terms | Rejected. First signed wins. The second is waitlisted by a maintainer | `placement: no overlap` |
| A step range that goes past the number of layers | Rejected, with the layer count in the message | `placement: range within layers` |
| Two capstone patrons at once, two sector patrons for one sector at once | Rejected | `placement: capstone and sector are singletons` |
| More than 10 Founding Steps | Rejected. Founding is the first 10 to sign | `placement: founding cap` |
| An asset path outside `sponsors/assets/`, a symlink, `..` | Rejected | `sponsor-assets: path safety` |
| An SVG with a script, event handler, external reference, embedded font or embedded raster | Rejected, naming the element | `sponsor-assets: svg rules` |
| An animated image (GIF, APNG, animated WebP) | Rejected | `sponsor-assets: no motion` |
| A PNG under 1024 px wide, an oversized file, an image whose pixel count would exhaust memory | Rejected before decoding where possible | `sponsor-assets: size and bomb limits` |
| A very wide or very tall logo, a transparent logo on a plate of the wrong tone, a wrong color profile | Fitted into the 80% safe area, normalized to sRGB, plate chosen by the sponsor | `sponsor-assets: fit and normalize` |
| A tile over 16 KB after re-encoding, an atlas over 512 KB | The build fails with the sizes | `budget: tile and atlas bytes` |
| A sponsor file with no matching asset | A warning, and plain stone on that step | `sponsor-build: missing asset` |
| An asset that no sponsor file references | The build fails. Unlisted art must not ship | `sponsor-build: orphan asset` |
| A poster that is not listed on `/sponsors` | The build fails (SPN-3) | `sponsor-build: listed on sponsors page` |
| A change to `sponsors/` without a maintainer approval | Blocked by CODEOWNERS | `ci: codeowners cover sponsors` |
| A contributor pull request that touches `sponsors/` | CI fails it with an explanation | `ci: sponsors are maintainer-only` |
| The same logo used by two sponsors | Allowed only for the same company. Otherwise a review flag | Decision: a maintainer judgment during review |
| Sponsor rebrands | A maintainer replaces the asset. The term continues | Decision: no code path |
| Sponsor acquired | The new owner is reviewed as a new sponsor | Decision: policy |
| Trademark dispute | The poster is pulled at once by removing the file | Decision: policy |

### Isolation, rendering and privacy (R3)

| Case | Behavior | Planned test |
| :--- | :--- | :--- |
| Any change to a sponsor file | The compiled brick data is byte-identical | `isolation: bricks identical with and without sponsors` |
| A registry, scoring or layout package importing sponsor data | An import lint rule fails the build | `isolation: import boundary` |
| The poster pass | One extra draw call, so the total stays at four | `budget: draw calls` |
| Atlas loading | After the first render, never blocking it | `budget: atlas loads after first paint` |
| A missing or invalid poster at runtime | Plain stone. Bricks are unaffected | `render: poster failure falls back` |
| A default build or a fork | Neutral placeholders only, no real logo | `build: placeholders without the official flag` |
| A sponsor link | HTTPS, `rel="sponsored noopener noreferrer"` | `a11y: sponsor link attributes` |
| Content Security Policy | Blocks third-party scripts and images, so sponsor code cannot load | `security: csp` |
| Do Not Track or Global Privacy Control | Nothing is sent | `privacy: opt out is honored` |
| The reporting endpoint | Stores only placement id, date and count. No cookie, user id or IP | `privacy: stored fields` |
| Bots and repeated hits | Counts are approximate, rate limited and capped per session. The method is published | `privacy: rate limit and session cap` |
| A flood of fake events | Rate limit and a hard monthly budget cap stop it (constitution principle VI) | `security: reporting endpoint is capped` |
| A visitor with several tabs | One summary per session | `privacy: one summary per session` |

## Requirements

### Functional Requirements

- **FR-001** (R1): The layout reserves stair cells and landing cells. No brick may occupy one.
- **FR-002** (R1): Every brick is reachable by the stair path with the keyboard alone. Sector, then category, then brick.
- **FR-003** (R1): A deep link opens a brick directly with no tour.
- **FR-004** (R1): Reduced motion replaces every tour with an instant jump and a short cross-fade.
- **FR-005** (R1): Unsold risers show engraved stone. There are no "your logo here" boards.
- **FR-006** (R3): `sponsors/*.json` validate against a schema, with the same text-safety rules as brick manifests.
- **FR-007** (R3): The build re-encodes logos onto a standard plate. Sponsors never supply the final pixels.
- **FR-008** (R3): Each tile is a 512 by 256 WebP of at most 16 KB, and the atlas is at most 512 KB, loaded after the first render.
- **FR-009** (R3): Posters use one extra draw call, for four in total.
- **FR-010** (R3): Every placement is labeled "Sponsor" in the tooltip, the HUD and the Table View. Links carry `rel="sponsored noopener noreferrer"`. A poster that is not on `/sponsors` fails the build.
- **FR-011** (R3): Reporting is first-party, aggregate and cookieless, and honors Do Not Track and Global Privacy Control.
- **FR-012** (R3): The compiled brick data is byte-identical with and without sponsors, and an import rule keeps sponsor code away from the registry, scoring and layout packages.
- **FR-013** (R3): Default builds and forks render placeholders. Only the official deployment loads real art.
- **FR-014** (R3): `sponsors/` is maintainer-only through CODEOWNERS and a CI check.

### Key Entities

- **Grand Stairway**: a channel through the shell with one tread per layer, one per sector.
- **Landing**: a group of treads where the camera pauses and shows one category.
- **Riser, Sponsor Step**: the vertical face of a tread, which can carry a poster.
- **Placement**: Capstone Patron, Sector Patron, Step Sponsor or Founding Step.
- **Sponsor**: a record in `sponsors/` with a slug, tier, term, link, alt text, plate and asset.
- **Plate**: the standard background the build draws behind a logo.
- **Poster atlas**: the build's texture array of all tiles.

## Success Criteria

- **SC-001** (R1): All bricks reachable by keyboard only. Verified by an end-to-end test over the whole registry.
- **SC-002** (R1): The 2D views meet WCAG 2.2 level AA.
- **SC-003** (R3): The isolation test proves byte-identical brick data with and without sponsors.
- **SC-004** (R3): Budgets hold in CI: four draw calls, 16 KB per tile, 512 KB per atlas.
- **SC-005** (R3): No third-party request is made for a sponsor, and no personal data is stored.
- **SC-006** (R3): Zero sponsor complaints about rankings (PRD metric).

## Assumptions

- The sector geometry (OQ-01) and the lattice (OQ-02) are decided first. Until then stairway count and
  placement are open, and the inventory is "about the number of layers times the number of
  stairways".
- Stairs cost 5% to 13% of an Epoch I shell depending on depth ([ARCHITECTURE](../../docs/ARCHITECTURE.md#capacity)). Depth is a layout parameter.
- Prices wait for 30 days of real traffic (OQ-07). Founding Steps may be sold earlier at a low flat rate.
- The first-party reporting endpoint lives on the same edge platform as the site. Its storage choice
  is a later ADR with a cost estimate.

## Out of Scope

| Item | Why |
| :--- | :--- |
| Paid ranking, featured bricks, sponsored search results | Rejected permanently (ADR-0008) |
| Third-party ad code, trackers, pixels | Forbidden by principle IX |
| Sponsor bricks inside the monument | Would read as an endorsement |
| Sponsor-supplied final images | They allow UI imitation. The build makes the pixels |
| Sponsor dashboards with per-user data | There is no per-user data |
| Prices and inventory | Wait for traffic data (OQ-07) |

## Open Questions

- **OQ-01** Sector geometry decides how many stairways exist and where. See [PRD](../../docs/PRD.md#13-open-questions).
- **OQ-07** Sponsor prices and inventory.
- **OQ-13** In what order does a landing list its bricks? The answer must be a plain, documented,
  deterministic order (for example score, then id) and never influenced by sponsors.
- **OQ-14** Does Epoch II continue the same stairways? Link stability argues for continuing, so the
  number of risers grows.
