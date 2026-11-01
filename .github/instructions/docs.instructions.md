---
description: "Use when writing or editing documentation, specs, ADRs, README or contributor guides. Covers tone, the no-dash rule, verifying claims, spec edge cases and links."
applyTo: "{docs,specs}/**/*.md"
---
# Documentation, specs and decisions

- **Plain, direct English.** Short sentences. Explain a term the first time. Contributors include
  first-time open-source authors.
- **No em dashes or en dashes.** Use a comma, a colon, parentheses or a new sentence. Verify with a
  character scan (for example PowerShell `Select-String -Pattern ([char]0x2014)`), because search
  tools can miss them.
- **Verify before you write.** Numbers, versions, prices and policies come from a primary source or a
  script, and the text says how they were checked. If you could not check, say so.
- **Specs list their edge cases,** and each one maps to a test or to a written decision that it is out
  of scope. Use the shape in `specs/001-brick-registry/spec.md`.
- **Decisions are ADRs** in `docs/decisions/NNNN-title.md`. See the `write-adr` skill.
- **Links are relative and their anchors must exist.** GitHub builds an anchor from a heading by
  lowercasing it, dropping punctuation and turning spaces into hyphens.
- **Do not edit** `docs/GitHub Pyramid Idea Analysis.md`. It is the founder's original plan, kept
  verbatim. Disagreements go in `docs/PLAN_REVIEW.md`.
- Keep the constitution, PRD and ADRs consistent. A change that invalidates one updates it.
