# ADR-0001: Record architecture decisions

Status: Accepted | Date: 2026-11-01 | Deciders: founder

## Context

GitPyramid will be shaped by many contributors over years. The reasons behind a choice are lost
fastest, and lost reasons cause repeated debates and accidental reversals.

## Decision

Every significant decision is a short Markdown file in `docs/decisions/`, numbered in order.

- Statuses: **Proposed** (a draft that awaits a maintainer), **Accepted**, **Superseded by ADR-NNNN**,
  **Rejected**.
- An accepted ADR is not edited except to fix typos or to change its status. A change of mind is a
  new ADR that supersedes the old one.
- Sections: Context, Decision, Alternatives considered, Consequences.
- The constitution requires an ADR to change the baseline stack, to add a paid service, to break a
  performance budget, or to change a published identifier.

## Alternatives considered

- Decisions in pull request descriptions only: they are hard to find later.
- A wiki: it drifts away from the code and has no review.

## Consequences

Small cost per decision, large saving in context. The `write-adr` skill drafts new ADRs in the
right shape.
