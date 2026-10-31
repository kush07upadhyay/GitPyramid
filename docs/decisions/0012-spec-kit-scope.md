# ADR-0012: Spec Kit is for large features only

Status: Proposed | Date: 2026-11-01 | Deciders: founder | Related: constitution, Development Workflow

## Context

GitHub Spec Kit was installed to give feature work a spec, plan and task structure. Its commands
are skills (`.github/skills/speckit-*`) backed by templates and scripts. It brings about 9,000
generated lines, 15 skill descriptions loaded into every Copilot chat in this repository, a CLI that
changes quickly (this machine had a stale 0.9.3 while the current release was 1.2.5), and a banner
that crashes on a Windows console until UTF-8 is forced. Most contributions (bricks, docs, fixes)
need none of it.

## Decision

- **Use Spec Kit for large, ambiguous or high-stakes features:** layout, viewport and picking,
  ingestion, Stack Architect, sponsor pipeline. Skip it for bricks, docs, small fixes and refactors.
- **The rule is tool-neutral.** The constitution requires a written spec in `specs/NNN-name/` for a
  non-trivial feature. The Spec Kit templates and commands are recommended, not required. A spec
  written by hand in the same shape is valid.
- **Keep the sets of skills apart.** Generated Spec Kit skills stay in `.github/skills/` and are not
  edited by hand. Hand-written project skills live in `.agents/skills/`.
- **Pin and document.** `docs` say how to install the current CLI (`uv tool install --force
  specify-cli`) and to set `PYTHONUTF8=1` on Windows.

## Exit path

If Spec Kit stops paying for itself: delete `.specify/` (move `memory/constitution.md` to
`docs/CONSTITUTION.md` first and update links) and the `.github/skills/speckit-*` folders. Existing
`specs/` stay as plain documents.

## Alternatives considered

- Remove it now: loses a shared language for large features and the constitution check.
- Require it for everything: ceremony for a solo founder and a barrier for contributors.
- Hand-roll templates only: possible, but loses upstream templates and the maintained commands.

## Consequences

Small contributions stay light. Large features keep a gate. Revisit after the first two large
features ship.
