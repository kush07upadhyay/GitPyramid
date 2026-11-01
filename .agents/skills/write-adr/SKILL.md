---
name: write-adr
description: 'Write an Architecture Decision Record (ADR) for GitPyramid. Use when a significant technical or product decision is made or changed, such as a new paid service or infrastructure, a performance budget change, a change to the baseline stack, published identifiers, scoring constants or tier thresholds, sector geometry, or licensing, and when asked to record, document or justify a decision.'
argument-hint: 'short title of the decision'
---

# Write an ADR

An ADR is one short file that records a decision, why it was made and what else was considered.
Decisions live in [docs/decisions](../../../docs/decisions). The constitution requires one for a
change to the baseline stack, any paid service or new infrastructure (with a cost estimate), a
budget change and a change to published identifiers. Changing scoring constants needs one too
([SCORING](../../../docs/SCORING.md)).

## Procedure

1. **Check one is needed.** Small, reversible choices do not need an ADR. If unsure, write a short one.
2. **Pick the number.** List `docs/decisions`. Take the highest number plus one, with four digits.
   File name: `NNNN-short-kebab-title.md`.
3. **Copy the template** from [adr-template.md](./assets/adr-template.md) and fill it in.
4. **Verify what you claim.** Costs, limits, versions and policies come from a primary source or a
   script. Say how you checked. If you could not check, say so.
5. **Be honest about alternatives.** Name at least one real option that was rejected and why. An ADR
   with no alternatives is an announcement.
6. **Set the status** to `Proposed` for a new decision. A maintainer changes it to `Accepted`.
   An accepted ADR is not edited except to fix typos or to change its status. A change of mind is a
   new ADR that supersedes it, and the old one is marked `Superseded by ADR-NNNN`.
7. **Link both ways.** Reference the ADR from the document or spec that depends on it, and list the
   documents it affects in `Related`.
8. **Check the text.** No em dashes or en dashes, plain English, relative links with real anchors.

## Style

- 20 to 60 lines. Context in a few sentences, then the decision in short bullets.
- State consequences, including the bad ones.
- Use the same first line format as the existing ADRs:
  `Status: Proposed | Date: YYYY-MM-DD | Deciders: founder | Related: ...`

ADR files are maintainer-owned (CODEOWNERS). A contributor may propose one in a pull request.
