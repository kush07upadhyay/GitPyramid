# Governance

Status: Proposed, see [ADR-0007](docs/decisions/0007-review-rule-and-ai-policy.md) | Binding rules: the
[constitution](.specify/memory/constitution.md)

GitPyramid is run by maintainers who are accountable to the community and to the constitution. This
page says who decides what, how a brick gets in and out, and how conflicts of interest are handled.

## Roles

| Role | Who | Can |
| :--- | :--- | :--- |
| **Maintainer** | Currently the founder, @kush07upadhyay | Merge, set impact levels, append the ledger, change taxonomy, manage sponsors, amend the constitution. |
| **Sector captain** | A trusted reviewer for one sector, appointed by maintainers | Review and approve brick pull requests in their sector. Cannot merge alone. |
| **Contributor** | Anyone who opens a pull request, issue or review | Propose and review. |
| **Sponsor** | A company or person who funds the project | Be listed and labeled. Has no say in governance or in the registry. |

Becoming a captain: about 10 merged bricks and about 20 substantive reviews, then a maintainer
invites you. Becoming a maintainer: a long record of captain-level work and a maintainer vote. A
maintainer who is inactive for six months becomes emeritus and can return on request.

## How decisions are made

- Maintainers decide, in public where possible, and explain why.
- A significant technical or product decision is an ADR in `docs/decisions/`.
- A change to the constitution is a pull request labeled `constitution`, open for comment for at
  least 7 days. See the constitution for the bootstrap exception while the project is new.
- Disagreement is welcome. Bring evidence. The maintainers' decision stands until a new ADR changes it.

## The life of a brick

1. **Suggest.** Anyone opens a "Suggest a brick" issue, or goes straight to a pull request.
2. **Pull request.** The author adds `registry/bricks/<owner>/<repo>.json`.
3. **CI.** Schema, path, taxonomy, text and link checks run. Online checks verify the repository
   is public, not archived and has the stated license.
4. **Reviews.** The author reviews other pull requests (see below). Reviewers check the facts.
5. **Merge.** A maintainer merges with a squash merge.
6. **Admission.** A maintainer or the admission bot appends a ledger line: id, impact level, tier and
   slot. The monument shows the brick at the next build.
7. **Life.** Live metrics change its color and labels. Its position never moves except at an Epoch
   boundary.
8. **Removal.** See the criteria below. The id is retired, never reused.

## The review rule (4-for-1)

Modeled on the awesome-list community. It keeps quality high and makes the project self-sustaining.

- Before your brick pull request is merged, **review the lesser of 4 and the number of other open
  brick pull requests**, and list the links in a comment on your pull request. On day one there may be
  fewer than four open, so you review all of them.
- A review counts when it points out something specific: a fact you verified, a mistake, a better
  category, a missing alternative, a duplicate. "Looks good" or a bare approval does not count.
  Comments about lint failures do not count.
- Maintainers and documentation-only fixes are exempt.
- Do not ask an AI tool to write your review. Use tools to check facts, then write your own words.
- A maintainer checks the links before merging. A bot to do this comes later.

To make this workable at launch, the maintainer opens a **review pool** of real brick pull requests
before announcing.

## Admission criteria (v1)

A repository can become a brick when it:

- is public, not archived, and not a template or a mirror of something already listed;
- has an open-source license that GitHub detects and that matches the manifest;
- has a README that explains what it does;
- is described accurately by the submitted text, which a human wrote or fully verified.

Repositories with under 100 stars, or under 30 days of public history, are allowed. CI warns and
reviewers look closer. If a new repository does the same job as a listed brick without a different
trade-off, it becomes an entry in that brick's `alternatives`.

## Removal criteria

A brick is removed when its repository has been archived for over 90 days with no successor, is
deleted, moves to a non-open license, is confirmed malicious, or breaks a policy. Maintainers say why
in the pull request that removes it.

## Impact levels

Impact (1 to 5, see [SCORING](docs/SCORING.md#impact-rubric)) is set by maintainers, never by the
submitter. Reviewers may argue for a level in the pull request. To contest a level, open an issue
with evidence.

## Conflicts of interest

- Say so on the pull request if you own, work for, or are paid by the project or its company.
- A person with such a tie cannot be the only approver of that project's brick.
- Maintainer-owned products (for example the founder's Vidective product) are labeled "By the
  maintainer" wherever they appear and never affect ranking.
- Sponsors cannot influence bricks, scores, ranking, AI answers or governance. See
  [SPONSORSHIP](docs/SPONSORSHIP.md).

## Epochs

A monument has a fixed size. When it is full a new connected structure begins. Layout quotas and
re-tiering change only at an Epoch boundary, as a reviewed migration with a public diff.

## Conduct

The [Code of Conduct](CODE_OF_CONDUCT.md) applies everywhere the project meets.
