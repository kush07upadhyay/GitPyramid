# Sponsorship

Status: Draft policy, no sponsors yet | Rule of law: constitution principle IX |
Design: [ADR-0008](decisions/0008-grand-stairways-and-sponsor-steps.md) |
Spec: [specs/003-grand-stairways-sponsor-steps](../specs/003-grand-stairways-sponsor-steps/spec.md)

GitPyramid stays free and open source because companies that benefit from open source fund it. In
the 3D monument their logos appear on the **Grand Stairways**, the steps visitors climb to reach
bricks. **Sponsors fund the stairs. Contributors build the walls.** Money never changes what is in
the registry or how it is ranked.

## What a sponsor gets

- A poster on a **Sponsor Step**: the vertical face of one or more steps on a Grand Stairway.
- A clearly labeled "Sponsor" tooltip with the sponsor's name, one line of text and an outbound link.
- A listing on the public `/sponsors` page with tier and term.
- A monthly report of first-party aggregate views and clicks for their placement.
- Credit in the README and release notes while the term runs.

## What a sponsor never gets

- A brick, or a say in which bricks exist, are removed, or are merged.
- Any effect on a brick's score, size, state, position, search rank or AI Stack Architect answer.
  Sponsor data is never an input to any of them.
- Category exclusivity. A database company cannot block another database company from sponsoring or
  from having a brick.
- Early or private access to registry data, ingestion data or unreleased scoring changes.
- An endorsement. Labels say "Sponsor", never "Recommended", "Partner" or "Verified".

## Placements

Counts depend on the final layout, so these are the shapes, not a price list.

| Placement | What it is | Notes |
| :--- | :--- | :--- |
| Capstone Patron | One poster at the top landing, visible on every stairway climb. | One at a time. |
| Sector Patron | A banner on the landing at the foot of one stairway. | One per sector. |
| Step Sponsor | The riser of one step, or a run of steps, on a stairway. | Most inventory. |
| Founding Step | A Step Sponsor among the first 10 to sign. | Discounted, longer term, permanent "Founding" mark on the Sponsors page. |

A stairway has one step per layer, so the inventory is roughly the number of layers times the number
of stairways. Unsold steps show plain engraved stone, not "your logo here" boards. A stairway full of
placeholders looks dead and does not help sellers. A single "Sponsor the stairs" step per stairway is
enough.

## Pricing approach

No prices are set in the repository. Set them after about 30 days of real traffic, using the
reported counts. A simple model: price per month equals your target cost per thousand views times
the placement's monthly views divided by 1,000. For example, 20,000 views a month at a target of $10
per thousand is $200. That example is an illustration, not a quote. Founding Steps can be sold
before traffic exists at a clearly low flat rate in exchange for a longer term.

## Acceptable sponsors

A sponsor must be a real company, project or foundation with a public website and a clear link to
software development. Maintainers may decline or remove any sponsor.

Not accepted: gambling and betting, adult content, tobacco and vaping, weapons, payday loans,
multi-level marketing, political campaigning, token sales and NFT mints, "get rich" claims,
cracked software and piracy tools, stalkerware and tools built to surveil individuals, anything
illegal where the project or the sponsor operates, and any party subject to sanctions that apply to
the maintainers.

Also not accepted: creative that attacks a named competitor, makes claims the sponsor cannot back up,
or imitates GitPyramid's own interface.

## Creative specification

The build, not the sponsor, produces the final poster, so every sponsor looks consistent and nothing
can imitate our UI.

| Item | Requirement |
| :--- | :--- |
| Logo file | SVG preferred (no scripts, no external references, no embedded fonts or raster images). Otherwise PNG at least 1024 px wide. |
| Plate | The build centers the logo on a standard plate. The sponsor picks `light` or `dark`. |
| Safe area | Logo fits inside 80% of the plate. Plate aspect is 2:1 (final tile 512 by 256). |
| Weight | After re-encoding to WebP, at most 16 KB per tile. |
| Motion | None. No animation, flashing, video or sound. |
| Text | Optional line up to 40 characters. No prices, countdowns, discount codes or calls to action such as "Download now". |
| Alt text | Required, up to 80 characters, plain text. |
| Link | HTTPS only. UTM parameters are allowed on the sponsor's own destination. |
| Other | No QR codes, no photographs of people without a release, no image that looks like a button or an error message. |

The built poster atlas stays within 512 KB in total and loads after the first render.

## Labeling and disclosure

- Every placement is labeled "Sponsor" in the 3D tooltip, the brick drawer and the Architect Table
  View.
- Links carry `rel="sponsored noopener noreferrer"`.
- The `/sponsors` page lists every sponsor, tier and term. **A sponsor image that is not on that page
  must not ship.** Contract amounts stay private.
- In keyboard and screen-reader views, sponsors appear once, in a separate "Sponsors" region, and
  never between bricks.

## Reporting without trackers

Sponsors will ask for numbers. We give first-party aggregate counts only.

- **View**: the poster has at least 30% of its area on screen for at least one second.
- **Click**: the outbound link was activated.
- The browser sends one small summary per session to a first-party endpoint. The endpoint stores
  only the placement id, the date and a count. No cookie, no user id, no IP address is stored.
- If the browser sends Do Not Track or Global Privacy Control, nothing is sent.
- Counts are labeled approximate because bots exist. The monthly report says how they are filtered.

## Conflicts of interest

- A sponsor may also have bricks. Its bricks follow the normal process. A maintainer or reviewer
  with a financial or employment tie to a company must say so on the pull request and cannot be the
  only approver of that company's brick.
- **Maintainer-owned products** (for example the founder's Vidective product) are labeled "By the
  maintainer" wherever they appear, follow the same placement rules as sponsors, and never use or
  change ranking.
- Sponsorship money does not buy a seat in project governance.

## Sponsor data

Sponsor data lives in `sponsors/` and changes only with maintainer approval. It is not registry
data. Planned shape (the Zod schema arrives with spec 003):

```json
{
  "slug": "example-co",
  "name": "Example Co",
  "tier": "step",
  "termStart": "2027-01-01",
  "termEnd": "2027-12-31",
  "url": "https://example.com/?utm_source=gitpyramid&utm_medium=sponsor",
  "alt": "Example Co logo",
  "plate": "dark",
  "asset": "assets/example-co.svg",
  "founding": true
}
```

`sponsors/NOTICE.md` says logos belong to their owners and are shown under the sponsor agreement.
They are not covered by the project's MIT or CC0 licenses. The default build shows neutral
placeholders so forks and local builds do not display anyone's trademark. Only the official
deployment loads the real art.

## Edge cases

| Situation | What happens |
| :--- | :--- |
| Term ends | The poster reverts to engraved stone on the next build. No empty frame. |
| Sponsor rebrands | A maintainer replaces the asset. The term continues. |
| Two sponsors want the same step | First signed wins. The other goes on a waiting list or takes another step. |
| A sponsor asks to hide or remove a competitor's brick | Declined. Bricks leave only under the removal rules in GOVERNANCE. |
| A sponsor's own brick is archived, relicensed or criticized | No effect on the sponsorship, and no special treatment of the brick. |
| Policy breach, or the sponsor becomes unacceptable | Poster removed. The unused part of the term is refunded pro rata. |
| Sponsor is acquired | The new owner is reviewed as a new sponsor. |
| Image fails the spec | The maintainer asks for a new file. The step stays plain until it passes. |
| Trademark dispute over a logo | Poster is pulled immediately. The sponsor must attest that it owns or may license the mark. |
| User blocks images or runs a text-only browser | The Table View lists the sponsor as text. Alt text is always present. |
| Reduced-motion setting | Camera tours become instant jumps. Posters never animate in any mode. |

## Money and legal checklist

Not legal or tax advice. Talk to a professional.

- Write a short sponsor agreement: term, fee, payment dates, trademark permission, takedown and
  refund terms, no guarantee of traffic, and an independence clause that repeats this page. Have a
  lawyer review it once.
- GitHub Sponsors takes no fee on sponsorships from personal accounts and up to 6% on sponsorships
  from organizations (3% card processing and 3% GitHub). Invoiced billing removes the card part.
  India is a supported region for receiving payouts.
- Sponsors from companies often want an invoice. Ask a chartered accountant about GST
  registration, invoicing foreign clients and receiving payments before the first invoice.
- Check your employment agreement before accepting any money for a side project.
- Keep a private ledger of contracts. Public data is only tier and term.
