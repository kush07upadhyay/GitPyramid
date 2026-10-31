# ADR-0005: Manifest path layout

Status: Proposed | Date: 2026-11-01 | Deciders: founder | Related: PLAN_REVIEW F-05

## Context

The plan places manifests at `registry/bricks/<category>/<repo-slug>.json`. A contributor must
choose the folder, GitHub repository names are not unique across owners, and reclassifying a brick
would rename its file.

## Decision

`registry/bricks/<owner>/<repo>.json`, all lowercase, one brick per file. The path is derived from
the repository URL alone, so there is nothing to decide and nothing to get wrong. The validator
computes the expected path in one function and reports the exact path to use. Sector and category
are fields, not folders.

## Alternatives considered

- By sector or category folder: redundant with the fields, can mismatch, and reclassification
  renames files.
- One flat folder: collisions between owners with the same repo name, and an unusable listing.
- Owner and repo joined with a separator in one filename: needs an escaping rule.

## Consequences

Lowercase keeps case-insensitive file systems safe. GitHub's web file listing truncates folders with
more than 1,000 entries, so the top-level `registry/bricks/` view will truncate once there are
over 1,000 distinct owners. Validation, search and the build do not use that view. If browsing
matters by then, shard by owner initial in a new ADR. The path function makes that a one-place change.
