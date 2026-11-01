---
description: "Use when working on sponsor data, sponsor logos, Sponsor Steps, posters, the Sponsors page or the Grand Stairways. Constitution principle IX applies in full."
applyTo: "sponsors/**"
---
# Sponsors

Sponsors fund the stairs. Contributors build the walls. Read
[constitution principle IX](../../.specify/memory/constitution.md), [SPONSORSHIP](../../docs/SPONSORSHIP.md)
and [spec 003](../../specs/003-grand-stairways-sponsor-steps/spec.md) first.

- **Maintainer-only.** CODEOWNERS and CI refuse changes from anyone else. If the user is not a
  maintainer, explain and stop.
- **A firewall, not a feature flag.** Sponsor data must never be imported by registry, scoring,
  layout, search or AI code. Compiled brick data must be byte-identical with and without sponsors.
- **Labeled and listed.** Every placement says "Sponsor". A poster that is not on the public Sponsors
  page must not ship. Links are HTTPS with `rel="sponsored noopener noreferrer"`.
- **No tracking and no motion.** First-party aggregate counts only, no cookies, honor Do Not Track and
  Global Privacy Control. Posters never animate, flash or play sound.
- **The build makes the pixels.** Logos are re-encoded onto a standard plate. Sponsors never supply the
  final image. Default builds and forks show neutral placeholders.
- **Logos belong to their owners.** They are not covered by the MIT or CC0 grants.
- **Never** add paid ranking, featured bricks or sponsor bricks. They are rejected permanently.
