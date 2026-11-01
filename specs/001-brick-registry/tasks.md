# Tasks: Brick Registry

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Legend: `[x]` done on this branch, `[ ]` later. IDs are stable so commits and issues can cite them.

## Phase 1: Data model

- [x] T001 Manifest, ledger and taxonomy schemas in `packages/registry/src/schema.ts`
- [x] T002 Plain-language message layer in `zod-messages.ts`
- [x] T003 Strict JSON parser with duplicate-key detection and line and column mapping (`json.ts`, `positions.ts`)
- [x] T004 Path rules in `paths.ts`
- [x] T005 Taxonomy file with five sectors and 54 categories in `registry/taxonomy.json`

## Phase 2: Checks (User Stories 1 and 2)

- [x] T010 Text safety: hidden characters, long dashes, links, markup, placeholders, warnings for hype and model-directed text (`text-safety.ts`)
- [x] T011 SPDX license check with deprecated ids and `NOASSERTION` handling (`license.ts`)
- [x] T012 Website check (`website.ts`)
- [x] T013 Pure `validateRegistry` with references, ledger and admission checks (`validate.ts`)
- [x] T014 Time zone tolerance for ledger dates

## Phase 3: Tools (User Stories 1, 2 and 4)

- [x] T020 `pnpm validate` with `--online`, `--changed-since`, `--format`, `--require-ledger`, `--root` (`cli.ts`, `git.ts`, `loader.ts`)
- [x] T021 Online checks with timeout, request budget, rate limit handling and id comparison (`online.ts`)
- [x] T022 GitHub annotation and step summary output that cannot be injected (`format.ts`)
- [x] T023 `pnpm brick:new` scaffolder (`scaffold.ts`)
- [x] T024 Generated JSON Schema and drift test (`build-schema.ts`, `schema-sync.test.ts`)

## Phase 4: Data and docs (User Stories 3 and 5)

- [x] T030 Official CC0 text in `registry/LICENSE`
- [x] T031 Ledger and 14 seed bricks, licenses checked against primary sources
- [x] T032 `registry/README.md`
- [x] T033 CONTRIBUTING template and example validated by `docs-examples.test.ts`
- [x] T034 Real registry validated by `registry-real.test.ts`
- [x] T035 Spec, plan and tasks (this folder)

## Later, tracked elsewhere

- [ ] T040 CI workflow that runs `pnpm check` and the online check on changed manifests (`ci/gatekeeper`)
- [ ] T041 `.agents/skills/add-brick` and `review-brick-pr` skills (`chore/agent-customizations`)
- [ ] T042 Review pool: five real brick pull requests opened before announcing (`docs/launch-kit`)
- [x] T036 `pnpm admit` appends the ledger line for a merged brick (`admit.ts`, `admit.test.ts`), added after the first review of the launch checklist showed that admitting by hand is error-prone
- [ ] T043 Admission bot that runs the same logic on merge, so no maintainer has to type the command (PRD R3)
- [ ] T044 Weekly job that flags archived or renamed repositories (PRD REG-7, R3)
- [ ] T045 Seed 500 ingestion and the `tier` calibration migration (PRD R1)

## Dependencies

T001 to T005 come first. T010 to T014 need T001 to T003. T020 to T024 need T013. T031 needs T013
and T021 to verify. T033 and T034 need T031. T040 needs T020.
