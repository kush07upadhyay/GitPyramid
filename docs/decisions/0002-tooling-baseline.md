# ADR-0002: Tooling baseline

Status: Accepted | Date: 2026-11-01 | Deciders: founder | Related: constitution, Technical Constraints

## Context

The project needs a toolchain that a first-time contributor can set up in minutes and that keeps
checks fast. Contributors use Windows, macOS and Linux.

## Decision

- **Language:** TypeScript in strict mode on Node.js 22 or newer.
- **Packages:** pnpm workspaces (`apps/*`, `packages/*`), pinned with the `packageManager` field.
- **Lint and format:** Biome. One tool, one config file. Registry JSON is excluded from formatting
  so a first-time contributor using the GitHub web editor is never blocked by whitespace.
- **Tests:** Vitest, run from the repository root.
- **Schemas:** Zod is the source of truth for manifest structure and TypeScript types. The published
  JSON Schema is generated from it and a test fails if the committed file drifts.
- **Scripts:** `tsx` runs TypeScript tools without a build step.
- One command, `pnpm check`, runs lint, typecheck, tests and registry validation. CI runs the same.

## Alternatives considered

- npm or Yarn: no workspace advantage for this layout, and pnpm's strict `node_modules` catches
  undeclared imports.
- ESLint plus Prettier: more config, more dependencies, slower. Revisit if a needed rule only
  exists there.
- Jest: slower to configure with TypeScript and ESM than Vitest.
- Hand-written JSON Schema plus hand-written types: two sources of truth that drift.

## Consequences

Contributors need Node 22 and pnpm (Corepack provides it). Changing any of these needs a new ADR.
