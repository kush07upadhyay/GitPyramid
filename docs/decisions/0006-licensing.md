# ADR-0006: Licensing

Status: Accepted | Date: 2026-11-01 | Deciders: founder | Related: constitution principle VII

## Context

The repository holds three kinds of material: source code, curated data and sponsor artwork.
One license does not fit all of them, and the model must stay simple for contributors.

## Decision

- **Code and documentation:** MIT (`LICENSE`).
- **Registry data** (`registry/**`): CC0 1.0 (`registry/LICENSE`). Maximum reuse, no attribution
  burden, and the same stance the awesome-list community takes for curated lists.
- **Sponsor artwork** (`sponsors/assets/**`): owned by the sponsors, shown under the sponsor
  agreement, not licensed to the public (`sponsors/NOTICE.md`). Default builds show placeholders.
- By contributing, a person agrees that their contribution is licensed under the license of the
  files they change. No contributor license agreement and no sign-off is required.
- The repository contains no third-party source code.

## Alternatives considered

- MIT for everything: lets a downstream copy of the dataset claim ownership by relicensing.
- CC BY for data: attribution is easy to meet but adds friction for people who want to embed the
  data. Awesome-list convention favors CC0.
- A CLA: heavy for a community of first-time contributors.

## Consequences

Anyone, including a competitor, may copy the registry without credit. That is accepted. The moat is
curation quality, community and the monument, not data secrecy.
