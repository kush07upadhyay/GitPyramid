# Sponsor material

This folder is for **sponsor data and artwork**. It is maintained by the project's maintainers only
(see [CODEOWNERS](../.github/CODEOWNERS)), and nothing here is a sponsorship yet. There are no sponsors
at the moment. The rules that govern this folder are in
[constitution principle IX](../.specify/memory/constitution.md), [SPONSORSHIP](../docs/SPONSORSHIP.md) and
[the draft spec](../specs/003-grand-stairways-sponsor-steps/spec.md).

## Licensing of what will live here

Logos and other artwork in this folder belong to their owners. They are shown on the project's
website under a sponsor agreement. They are **not** covered by the project's MIT license (code and
documentation) or the CC0 dedication (registry data). Copying or reusing a logo needs the owner's
permission.

To keep that clear, the default build and every fork show neutral placeholders. Only the official
deployment loads real sponsor art.

## What will be here

```text
sponsors/
  NOTICE.md             this file
  <slug>.json           one record per sponsor: tier, term, link, alt text, plate
  assets/<slug>.svg     the logo the sponsor supplied
```

Sponsor data never feeds the registry, scores, layout, search or any AI answer. Each sponsor appears
on the public Sponsors page with its tier and term. A sponsor image that is not listed there must not
ship.

## Trademarks

Product names and logos are trademarks of their respective owners. GitPyramid is an independent
project. A sponsor does not endorse the project and the project does not endorse a sponsor.
