# Feature Specification: Brick Registry

**Feature Branch**: `001-brick-registry`
**Created**: 2026-11-01
**Status**: Implemented. CI wiring follows in the `ci/gatekeeper` branch.
**Input**: [PRD](../../docs/PRD.md) requirements REG-1 to REG-6, [ADR-0003](../../docs/decisions/0003-registry-data-model.md), [ADR-0004](../../docs/decisions/0004-stable-slots-and-ledger.md), constitution principles I, II, V, VI and VII.

## User Scenarios and Testing

### User Story 1 - A first-time contributor adds a brick in the browser (Priority: P1)

A visitor who has never used Git opens the template link in [CONTRIBUTING](../../CONTRIBUTING.md),
fills in a single JSON file in the GitHub web editor, and opens a pull request.

**Why this priority**: constitution principle II. The project grows only if this path is easy.

**Independent Test**: take the template from CONTRIBUTING, replace the placeholders, run
`pnpm validate`. It must report no errors.

**Acceptance Scenarios**:

1. **Given** the template link, **When** it is opened, **Then** the editor is prefilled with exactly
   the template in the document.
2. **Given** the finished example in CONTRIBUTING, **When** it is validated, **Then** it has no
   errors and no warnings other than "waiting for admission".
3. **Given** the untouched template, **When** it is validated, **Then** it fails and names the
   placeholder repository and the placeholder sentence.
4. **Given** a project that is already listed, **When** `pnpm brick:new` is run for it, **Then** the
   command refuses and does not overwrite the file.

### User Story 2 - A contributor who made a mistake is told how to fix it (Priority: P1)

CI explains each problem in plain language, with the file, line and column, and says what to do.

**Why this priority**: constitution principle II. CI messages are part of the feature.

**Independent Test**: break a manifest in each way listed under Edge Cases. Every message must name
the field and the fix, never a raw schema path.

**Acceptance Scenarios**:

1. **Given** a trailing comma on line 7, **When** validated, **Then** the message says it is a
   trailing comma and points at line 7.
2. **Given** a category that belongs to another sector, **When** validated, **Then** the message
   names the sector it belongs to.
3. **Given** a manifest with `pScore`, `id`, `impact` or `tier`, **When** validated, **Then** the
   message explains that the value is computed or maintainer-owned.
4. **Given** three missing fields, **When** validated, **Then** all three are reported at once.

### User Story 3 - A maintainer admits a brick and the ledger stays consistent (Priority: P2)

A maintainer appends one line to `registry/ledger.jsonl` with the next id, the immutable GitHub id
and an impact level. The validator rejects any line that would break the invariants.

**Independent Test**: append lines that skip an id, reuse an id, repeat a repository or point at a
missing manifest. Each must fail with a message that names the expected value.

**Acceptance Scenarios**:

1. **Given** ids 1 to 3, **When** a line with id 5 is added, **Then** validation says the next id
   must be 4.
2. **Given** a retired entry, **When** its manifest still exists, **Then** validation fails. When it
   does not, validation passes.
3. **Given** a maintainer in India at 05:00 local time on 1 November (still 31 October in UTC),
   **When** they write today's local date, **Then** validation passes.

### User Story 4 - The registry is checked against GitHub without ever blocking on an outage (Priority: P2)

`pnpm validate --online` asks GitHub whether each repository is public, not archived, carries the
stated license and is still the same repository.

**Independent Test**: run it against a fake GitHub (see `online.test.ts`) for every status code and
payload shape listed under Edge Cases.

**Acceptance Scenarios**:

1. **Given** a repository that moved, **When** checked, **Then** the message gives the new path.
2. **Given** a repository name taken over by a different project, **When** the GitHub id differs
   from the ledger, **Then** validation fails with a message that says so.
3. **Given** a rate limit, a network failure or a 5xx answer, **When** checked, **Then** the result
   is a warning, never an error, and the run does not hang.

### User Story 5 - Anyone can read, validate and reuse the registry as data (Priority: P3)

The registry is CC0. The JSON Schema is published for editor hints, and the validator is a library
with no I/O so it can run in a Worker or a browser editor later.

**Independent Test**: the schema in the repository must equal the schema generated from the code.

## Edge Cases

Each row maps to a test. File names are in `packages/registry/src/`.

### Files and JSON

| Case | Behavior | Test |
| :--- | :--- | :--- |
| Trailing comma, missing comma, single quotes, comments | Plain explanation and the right line and column | `json.test.ts` (parseStrictJson), `validate.test.ts` "points at a trailing comma with the right line" |
| Text after the object, unterminated string | Reported with position | `json.test.ts` |
| Empty file, top-level array or string | "File is empty" or "must be an object" | `json.test.ts`, `validate.test.ts` "rejects an empty file", "rejects a top-level array and a string" |
| Duplicate keys at any depth | Error at the second key (JSON parsers silently keep the last) | `json.test.ts` "finds duplicate keys at any depth", `validate.test.ts` "rejects duplicate keys" |
| `__proto__`, `constructor` and similar keys | Treated as unknown fields. No prototype pollution | `json.test.ts`, `validate.test.ts` "rejects a __proto__ key without polluting anything", "treats inherited property names as unknown" |
| UTF-8 byte order mark | Reported, and the rest of the file is still checked | `validate.test.ts` "reports a byte order mark but keeps checking" |
| Windows line endings | Accepted | `validate.test.ts` "accepts Windows line endings" |
| Bytes that are not UTF-8 | Rejected | `validate.test.ts`, `integration.test.ts` "flags bytes that are not UTF-8" |
| File over 8 KB | One error, no cascade | `validate.test.ts` "rejects an oversized file without cascading errors" |
| Non-JSON file in `bricks/` | Rejected | `validate.test.ts`, `integration.test.ts` "reads stray non-json files" |
| File order on disk | Output is identical | `validate.test.ts` "does not depend on file order" |

### Paths and identity

| Case | Behavior | Test |
| :--- | :--- | :--- |
| Uppercase path | Rejected and the lowercase path is suggested | `validate.test.ts`, `paths.test.ts` |
| Wrong folder depth | Rejected | `validate.test.ts` "rejects a file outside owner/repo shape" |
| `repo` field differs from the path | Rejected, says how to fix | `validate.test.ts` "rejects a repo that does not match the path" |
| Template placeholder `owner/repo` | Rejected | `validate.test.ts` "rejects the template placeholder repo" |
| Longest valid owner (39) and repo (100) | Accepted | `paths.test.ts` "accepts the longest valid owner and repo" |
| Dots, underscores and hyphens in repo names | Accepted | `paths.test.ts` |
| Lowercase vs GitHub's casing | Registry paths are lowercase. GitHub is case-insensitive | `paths.test.ts`, `integration.test.ts` "accepts a full GitHub URL" |

### Fields and text

| Case | Behavior | Test |
| :--- | :--- | :--- |
| Missing fields | All reported at once, each as "is missing" | `validate.test.ts` "reports every missing field, not just the first" |
| Derived or maintainer-owned fields | Rejected with the reason | `validate.test.ts` (derived and unknown fields) |
| Unknown fields | Rejected, allowed fields listed | `validate.test.ts` "rejects unknown fields and lists the allowed ones" |
| Wrong type, length, pattern | Plain message with the field name | `validate.test.ts` (schema problems) |
| Wrong `$schema` reference | Rejected. A missing one is accepted | `validate.test.ts` |
| Long dashes (em, en and look-alikes) | Rejected. A hyphen is fine | `text-safety.test.ts` "rejects the long dash", "allows a plain hyphen" |
| Links, markup, control, zero-width and bidirectional characters | Rejected | `text-safety.test.ts` |
| Placeholder text (`TODO`, `TBD`, `FIXME`, tag `replace-me`) | Rejected | `text-safety.test.ts`, `validate.test.ts` "rejects the placeholder tag" |
| A real project about to-do lists | Accepted. Only the upper-case marker counts | `text-safety.test.ts` "does not flag words that only contain todo", `validate.test.ts` "allows a project that is a todo app" |
| A project called `Socket.io` | Accepted. A name that merely looks like a domain is not a link | `text-safety.test.ts`, `validate.test.ts` "lets a project called Socket.io keep its name" |
| Promotional wording, shouting | Warning only | `validate.test.ts` "warns, but does not fail, on promotional text" |
| Text that reads like an instruction to a model | Warning only | `validate.test.ts` "warns on text that reads like an instruction to a model" |
| Latin mixed with look-alike Cyrillic letters | Warning. Fully non-Latin text is fine | `text-safety.test.ts` |
| Duplicate tags | Rejected | `validate.test.ts` |

### Taxonomy, license and website

| Case | Behavior | Test |
| :--- | :--- | :--- |
| Category of another sector | Rejected, names the right sector | `validate.test.ts` "rejects a category from another sector" |
| Unknown category | Rejected, lists the valid ones | `validate.test.ts` "rejects an unknown category" |
| Missing or broken taxonomy file | Reported once, category checks skipped, no crash | `validate.test.ts` |
| Deprecated SPDX id (`GPL-2.0`, `GPL-3.0+`) | Rejected, names the replacement | `license.test.ts`, `validate.test.ts` |
| Invalid expression, wrong case | Rejected with a hint. Raw parser errors never reach the user | `license.test.ts` |
| `WITH` exceptions and `OR` expressions | Accepted | `license.test.ts` |
| `http` link, credentials, IP address, `localhost`, link shorteners, placeholder domains | Rejected | `website.test.ts`, `validate.test.ts` |
| Internationalized domains, unusual ports | Warning | `website.test.ts` |

### References and ledger

| Case | Behavior | Test |
| :--- | :--- | :--- |
| `compatibleWith` or `alternatives` names a missing brick | Error that points at the entry | `validate.test.ts` "rejects a reference to a missing brick" |
| Self reference, duplicate reference | Error | `validate.test.ts` |
| Both compatible and alternative | Warning | `validate.test.ts` |
| Referenced file exists but is broken | No second error | `validate.test.ts` "does not cascade" |
| Gap, reuse or non-sequential ids | Error names the expected id | `validate.test.ts` (the ledger) |
| Repository or GitHub id admitted twice | Error | `validate.test.ts` |
| Date in the future, one day of time zone skew | Future fails. One day is tolerated | `validate.test.ts` "allows one day of time zone skew", "handles month and year boundaries" |
| Impossible date such as 2026-02-30 | Error | `validate.test.ts` (the ledger) |
| Blank lines, Windows line endings, a broken line in the middle | Handled. Error names the line | `validate.test.ts` |
| Manifest without a ledger entry | Warning. An error when `--require-ledger` is set | `validate.test.ts` "warns about bricks nobody admitted yet" |
| Ledger entry without a manifest | Error unless retired | `validate.test.ts` "flags an entry whose manifest is missing" |
| Retired entry whose file still exists | Error | `validate.test.ts` "accepts a retired entry with no manifest, and rejects one that still has a file" |

### Online checks

| Case | Behavior | Test |
| :--- | :--- | :--- |
| Healthy repository | No output | `online.test.ts` |
| 404, private, disabled, archived | Error | `online.test.ts` |
| Renamed or moved | Error with the new path | `online.test.ts` "reports a renamed repository" |
| Name taken over (GitHub id differs from the ledger) | Error | `online.test.ts` "catches a repository name that was taken over" |
| Fork, template, idle over a year, under 30 days old, under 100 stars | Warning. Exactly 365 days is not idle | `online.test.ts` |
| License differs from GitHub | Error with both values | `online.test.ts` |
| GitHub cannot detect the license (Linux, Git, PyTorch) | Warning only | `online.test.ts` "only warns when GitHub cannot detect the license" |
| `GPL-2.0` reported for `GPL-2.0-only` | Match | `online.test.ts`, `license.test.ts` |
| Rate limit (403 with zero remaining, 429) | One warning and the run stops | `online.test.ts` |
| Network failure, 5xx, a body that stalls after the headers, an unexpected payload, a timeout | Warning, and the run never hangs | `online.test.ts` "never turns a network failure or server error into an error", "gives up when the body stalls" |
| A 403 that is not rate limiting (or a 451) | Error: the repository is blocked | `online.test.ts` "treats other 403 answers as an unavailable repository" |
| Request budget exhausted | Warning that says how many were skipped | `online.test.ts` "respects the request limit" |
| Token handling | Sent only to `api.github.com`, and only when set | `online.test.ts` |

### Output, scaffolder, CLI and consistency

| Case | Behavior | Test |
| :--- | :--- | :--- |
| Newlines or `%` in a message or file name | Cannot inject a workflow command | `format.test.ts` (GitHub annotations) |
| Markup in a message | Cannot become markup in the step summary | `format.test.ts` (step summary) |
| Scaffold: prefill, license normalization, undetectable license, unsafe homepage | Fills what it can, leaves human fields as placeholders | `integration.test.ts` (scaffoldBrick) |
| Scaffold: existing file, moved repo, missing repo, offline, network failure, bad input | Refuses or degrades with a clear message | `integration.test.ts` |
| Exit codes and bad usage | 0 ok, 1 errors, 2 usage | `integration.test.ts` (cli main) |
| Admit: missing impact, impact outside 1 to 5 or fractional, bad repository, login, date or GitHub id, offline without an id | Usage mistake. Exit 2. Nothing written | `admit.test.ts` (usage mistakes) |
| Admit: no manifest yet, a manifest with errors, already admitted | Refused. Exit 1. Ledger byte-identical | `admit.test.ts` (refusals leave the ledger untouched) |
| Admit: a ledger that already has a gap or another problem | Refused, because the next id cannot be trusted | `admit.test.ts` "when the ledger already has a gap" |
| Admit: the same GitHub id under another name | Refused as a duplicate | `admit.test.ts` "when the same GitHub id is already in the ledger" |
| Admit: private, archived, disabled, moved, missing, rate limited (403 or 429), server error, odd answer, network down, wrong `--github-id` | Refused with the reason. A plain 403 is not called a rate limit | `admit.test.ts` (refusals) |
| Admit: Windows line endings, no final newline, empty or missing ledger | Line endings matched, newline repaired, first id is 1 | `admit.test.ts` (the happy path) |
| Admit: a line that would break the ledger, such as a future date | Checked in memory before writing. Refused | `admit.test.ts` "when the line itself would break the ledger" |
| Admit: dry run | Prints the line. Writes nothing | `admit.test.ts` "writes nothing in a dry run" |
| `--changed-since` with an option-like value | Rejected so it cannot become a git option | `integration.test.ts` "refuses an unsafe git reference" |
| Published JSON Schema drifts from the code | Test fails | `schema-sync.test.ts` |
| CONTRIBUTING template or example drifts from the validator | Test fails | `docs-examples.test.ts` |
| The real registry breaks | Test fails | `registry-real.test.ts` |

## Requirements

### Functional Requirements

- **FR-001**: Manifest schema v1 has exactly the fields in [ADR-0003](../../docs/decisions/0003-registry-data-model.md). Unknown fields are rejected. Known derived fields are rejected with an explanation.
- **FR-002**: Every issue has a severity, a file, a code and a plain-language message. It has a line and column when the position is known.
- **FR-003**: Validation is a pure function of an in-memory snapshot. Loading files, git and the network are separate adapters.
- **FR-004**: `pnpm validate` is offline by default. `--online` adds GitHub checks. `--changed-since <ref>` limits online checks to changed manifests. `--format github` writes annotations. `--require-ledger` makes unadmitted bricks an error.
- **FR-005**: Facts about a contributor's file are errors. Heuristics and any trouble reaching GitHub are warnings.
- **FR-006**: The ledger has contiguous ids from 1, never reused, with an optional immutable GitHub id per repository.
- **FR-007**: The taxonomy lives in one maintainer-owned file. A brick's category must belong to its sector.
- **FR-008**: `pnpm brick:new owner/repo` creates a manifest prefilled from GitHub that fails only on the fields a human must write.
- **FR-009**: The JSON Schema is generated from the Zod schema. A test fails if they drift.
- **FR-010**: All text from manifests is treated as untrusted (constitution principle VI). Output escapes it.
- **FR-011**: Examples in contributor documentation are validated by tests.
- **FR-012**: Registry data is licensed CC0 with the official legal text.

### Key Entities

- **Brick manifest**: community-owned JSON file for one repository. Human-checkable facts only.
- **Ledger entry**: maintainer-owned line with the id, GitHub id, admission date, admitting maintainer, impact level and optional tier, incubating and retired flags.
- **Taxonomy**: five sectors, each with categories.
- **Issue**: one finding, with severity, code, file, message and optional position.
- **Snapshot**: the files of a registry held in memory. The unit of validation.

## Success Criteria

- **SC-001**: The CONTRIBUTING example and template behave as described (tests).
- **SC-002**: The validator checks 5,000 bricks (Epoch I) in under one second and 50,000 in under five seconds on a laptop. Measured: 0.33 s and 4.3 s, near-linear.
- **SC-003**: All 14 seed bricks validate offline with no errors and no warnings, and online with no errors.
- **SC-004**: Every edge case above maps to a passing test. `pnpm check` is green.
- **SC-005**: Reviewers confirm every message names the field and the fix (manual review of the table above).

## Assumptions

- Unauthenticated GitHub API calls allow 60 requests an hour per IP. CI uses `GITHUB_TOKEN` and the validator only checks changed manifests.
- GitHub redirects renamed repositories and keeps the numeric repository id stable.
- Maintainers write local dates. CI runs in UTC. One day of skew is therefore tolerated.
- Ten seed licenses match what GitHub detects. Linux, Git and PyTorch report `NOASSERTION`, so their
  licenses were read from their own license files. GitPyramid's license is its own `LICENSE` file,
  which GitHub will detect after the first push.

## Out of Scope

| Item | Where it goes |
| :--- | :--- |
| CI workflow that runs these checks | Branch `ci/gatekeeper` |
| Admission bot that appends ledger lines on merge, with no maintainer typing the command | PRD R3 |
| Weekly job that flags archived or renamed repositories | PRD REG-7, R3 |
| Scores, states, tiers and positions | [Spec 002](../002-pyramid-score/spec.md) and the layout spec |
| Web form for adding a brick | After launch, if the JSON path proves too hard |
| Filling in `tier` for the seed bricks | The Seed 500 calibration migration, as a reviewed pull request |

## Open Questions

- **OQ-A**: Should the ledger store the size tier at admission (as now) or should the compile step
  derive it from a frozen config? The tier is optional so either works. Decide with the Seed 500
  calibration in [Spec 002](../002-pyramid-score/spec.md).
