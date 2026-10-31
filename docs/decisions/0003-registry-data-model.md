# ADR-0003: Registry data model

Status: Proposed | Date: 2026-11-01 | Deciders: founder | Related: PLAN_REVIEW F-05, F-10, F-21

## Context

The plan stores `pScore`, `state`, `layer`, `gridCoord` and `dimensions` inside every brick
manifest. Those values change weekly or depend on all other bricks. Contributors could also fake
them, and the LLM later reads manifest text.

## Decision

Three owners, three kinds of file.

1. **Community manifests** at `registry/bricks/<owner>/<repo>.json` hold facts a reviewer can check:
   `repo`, `name`, `sector`, `category`, `problemSolved`, `techStack`, `license`, `website`,
   `compatibleWith`, `alternatives`. Unknown fields are rejected, and known derived fields get a
   message that says they are computed.
2. **Maintainer ledger** at `registry/ledger.jsonl`, one JSON object per line, append-only: `id`,
   `repo`, `admitted`, `by`, `impact` (1 to 5), optional `tier`, `slot`, `incubating`, `retired`.
   Contributors never edit it.
3. **Derived data** (stars, scores, states, positions) is computed at build time from a metrics
   snapshot and is never committed.

Text fields are plain text only: length limited, no URLs, markup, em or en dashes, control, zero-width
or bidirectional override characters. CI also warns on phrases that look like instructions to a
model. The structural schema is `registry/schema/brick.schema.json`, generated from Zod.

## Alternatives considered

- Everything in one manifest (the plan): churn, spoofing, conflicts.
- A database: loses reviewable, forkable, diffable data and the contributor story.
- YAML manifests: friendlier to hand edit, but the plan, the schema tooling and the compile step
  all prefer JSON. Error messages carry line and column to make JSON forgiving.

## Consequences

Pull requests stay small and conflict-free. A maintainer or bot must append a ledger line when a
brick merges, until the admission bot exists. The validator warns, not fails, for bricks without a
ledger line yet.
