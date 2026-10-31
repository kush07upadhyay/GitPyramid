# ADR-0007: Review rule, admission criteria and AI-assistance policy

Status: Proposed | Date: 2026-11-01 | Deciders: founder | Related: PLAN_REVIEW F-23, F-26

## Context

The plan adopts the awesome-list "review 4 other open pull requests" rule to stop spam and to make
the project self-sustaining. On day one there are no other open pull requests, so no one can
satisfy it. A viral post will also attract low-effort and fully generated submissions.

## Decision

**Review rule.** An author of a brick pull request reviews the lesser of 4 and the number of other
open brick pull requests, and lists the links in a comment. A review must name something specific
(a verified fact, a mistake, a better category, a missing alternative). "Looks good" and bare
approvals do not count. Lint comments do not count. Exceptions: maintainers, and documentation-only
fixes. Before announcing, the maintainer opens a review pool of real brick pull requests so the
first contributors have something to review.

**Admission criteria (v1, objective, checked by CI where possible).** The repository is public, not
archived, not a template or a mirror of another listed project, has an open-source license that
GitHub detects and that matches the manifest, and a README. Low-signal repositories (under 100
stars, or under 30 days public) are allowed but trigger a warning and a closer review.
Maintainers decide the rest.

**Removal criteria.** Archived for over 90 days with no successor, relicensed to a non-open
license, deleted, confirmed malicious, or a policy violation. Removal retires the id.

**AI assistance.** Allowed. The human author must verify every claim against the repository, write
or edit the `problemSolved` sentence, and say in the pull request which tool helped. Fully
generated, unverified submissions are closed. Reviewers must not delegate their review to an AI.

**Self-promotion.** Owners may submit their own project and must say so. Their pull request needs
an independent approval.

## Alternatives considered

- No review rule: spam and quality loss.
- A rule fixed at 4: impossible at launch.
- Automatic star thresholds: reject good new projects, and stars can be bought.

## Consequences

Slightly more process. The maintainer must seed the review pool. A bot to verify review claims
comes later. The repository publishes the rule so contributors see why it exists.
