# Next steps for the founder

This is your checklist. Everything the repository can do for itself is done and tested. What is
left needs your accounts, your money, your name or your judgment, so a tool cannot do it for you.
Work top to bottom. The order matters, and the places where it matters are marked.

Commands are for Windows PowerShell. Use `;` between commands, never `&&`.

## What is already done

The history is in `git log --oneline --graph`. In short:

- A registry with 14 real bricks, a validator, a scaffolder and `pnpm admit`.
- The Pyramid Score, tested down to its boundaries.
- CI, a pull request guard, Dependabot, a Markdown link checker and a repository setup tool.
- Rules, requirements, architecture, 12 decisions, three specs, community files and a launch kit.

What does **not** exist yet: the 3D monument, search and the AI Stack Architect. The README says so,
and so should every post you write ([launch kit](launch/contributor-launch-kit.md)).

## 0. Three decisions only you can make

### The name and the Git trademark

The Git project's trademark policy does not allow "Git" as a syllable in a new product name, and
"GitPyramid" fits that pattern. Enforcement against small open-source projects looks rare, but a
forced rename after you have launched is expensive. Read
[ADR-0010](decisions/0010-project-name-and-trademark.md). The recommended order is:

1. Send the email below today.
2. Do not buy the domain or announce until you have an answer.
3. Pick a fallback name now, so a "no" costs you an afternoon and not a week. These were free as a
   `.com` and as a GitHub name on 2026-11-01 (check again before buying): `repopyramid`, `repomid`,
   `sourcepyramid`, `codeziggurat`, `ossziggurat`, `repoziggurat`, `openziggurat`.

To: `trademark@sfconservancy.org`

```text
Subject: Name question: "GitPyramid", a free open-source project

Hello,

I am starting an open-source project called GitPyramid. It is a public registry of
open-source projects, shown as a 3D pyramid, at https://github.com/kush07upadhyay/GitPyramid.
It is not a version control tool and has no commercial product.

I read the Git trademark policy and understand that "Git" should not be used as part of
a new product name. Before I announce the project, may I use the name "GitPyramid"? If
not, I will rename it. I would like to ask before it grows.

The project says clearly that it is independent and not affiliated with the Git project
or GitHub.

Thank you,
Kushal Upadhyay
```

If the answer is yes, or you decide to take the risk, add one sentence to the README notices, next
to the GitHub one: "Git is a trademark of Software Freedom Conservancy, and GitPyramid is not
affiliated with the Git project." If the answer is no, rename (a few hours: the repository, the
package scope, the schema id and the README).

### Your employer and your equipment

If you have a job, read your employment agreement for rules on side projects, outside work and
intellectual property before you announce, and ask HR or legal if the wording is not clear. This is
not legal advice, and nobody else can judge it for you. Do the project on a personal computer with
personal accounts, and use personal accounts for the domain, the email routing and any money. The
commit history contains only a personal address and your GitHub `noreply` address.

### Personal account or organization

Most serious projects live under an organization. GitHub redirects a moved repository, so you can
decide later ([PRD OQ-09](PRD.md#13-open-questions)). Do it before the announcement if you want the
public link to be final. Moving a repository changes every `kush07upadhyay/GitPyramid` link in the
files. The validator's check for renamed repositories and a search and replace will find them.

## 1. Read it and run it

```powershell
cd path\to\GitPyramid
pnpm install
pnpm check
```

`pnpm check` runs the lint, the typecheck, the tests, the link check and the registry validation.
It should end without errors. Then read, in this order: `README.md`, `CONTRIBUTING.md`,
`GOVERNANCE.md`, `docs/PRD.md` and `docs/PLAN_REVIEW.md` (which records every place the
founding plan was wrong or unverified, with the evidence).

The decisions in `docs/decisions` are marked **Proposed**. Change the status line to **Accepted**
in the ones you agree with, and open a discussion about the ones you do not.

## 2. Push to GitHub (done for `main`)

`main` was pushed on 2026-11-01 as a plain fast-forward, and the CI `check` job passed on its first
run. Keep this section for the pattern below: any later direct push has to happen **before step 3**,
because step 3 locks `main` so that it only accepts pull requests.

```powershell
git status
git push origin main
```

- `git status` should say the working tree is clean.
- Sign in with the browser window Git opens. **Never paste a token into a command or a file.**
- Push only a plain fast-forward. If Git refuses, do not force anything. Stop and ask.
- Only `main` needs to go. The other local branches are merged history, except the five `brick/*`
  branches, which step 5 turns into review pull requests.

Check on GitHub that the README looks right, the **Actions** tab shows a green CI run, and the logo
shows. Your contribution graph fills from commits on `main` made with an email GitHub knows. The
commits use your `noreply` address, which counts.

## 3. Apply the repository settings

`pnpm setup:github` sets the description, topics, squash-only merging, secret scanning, private
vulnerability reporting, pinned-action enforcement, approval of checks on pull requests from forks,
24 labels, the seed issues and a protection
ruleset on `main`. It prints a plan first and changes nothing until you add `--apply`. It is safe to
run twice.

### 3a. Make a short-lived token

GitHub, then your profile picture, **Settings**, **Developer settings**, **Personal access tokens**,
**Fine-grained tokens**, **Generate new token**.

- Expiration: 7 days.
- Repository access: **Only select repositories**, then `GitPyramid`.
- Repository permissions: **Administration** read and write, **Issues** read and write, **Pull
  requests** read and write, **Contents** read-only. Metadata read-only is added for you.

### 3b. Give it to the terminal, not to a file

```powershell
$secure = Read-Host "Paste the token (nothing is shown)" -AsSecureString
$env:GITHUB_TOKEN = [System.Net.NetworkCredential]::new("", $secure).Password
```

Never put the token in a file, a chat or a commit. This lasts only as long as the terminal window.

### 3c. Look, then apply

```powershell
pnpm setup:github
pnpm setup:github --apply
```

If a step ends with a 403 or 404, the message names the call. Add the missing permission to the token
and run the command again. Nothing is duplicated. Starter labels such as `bug` and `question` are
left alone. Add `--prune-default-labels` if you want them gone.

### 3d. Do these by hand (GitHub does not allow them through the API)

- **Discussions:** repository **Settings**, **General**, **Features**, tick **Discussions**. The
  issue forms link to it, so do this before you announce. Suggested categories: Announcements, Q&A,
  Ideas, Show and tell.
- **Social preview** (optional): **Settings**, **General**, **Social preview**. Upload a 1280 by 640
  PNG. A simple one is the logo from `docs/brand/logo.svg` on a plain background.
- **Collaborators:** repository **Settings**, **Collaborators**. Keep the list empty. Nobody on it
  means nobody but you can push to `main` or to any other branch of this repository. See
  [who can change what](#who-can-change-what).

### 3e. Clean up

```powershell
Remove-Item Env:GITHUB_TOKEN
```

Then delete the token on GitHub (the same page where you made it).

### How you work from now on

`main` accepts changes only through a pull request with green checks. You can merge your own,
because no second approval is required. Direct pushes are blocked on purpose.

```powershell
git checkout main; git pull
git checkout -b docs/fix-typo
# make the change
git add -A; git commit -m 'docs: fix a typo'
git push -u origin docs/fix-typo
```

GitHub prints a link. Open it, create the pull request, wait for the green checks and choose
**Squash and merge**. The title becomes the commit message on `main`, so write it as a
[Conventional Commit](https://www.conventionalcommits.org).

### Who can change what

This is the access model, and it needs no extra setting beyond the steps above.

| Who | Can do | How it is enforced |
| :--- | :--- | :--- |
| You | Push branches, merge pull requests, change anything | You are the owner of the repository |
| Everyone else | Fork, push to their own fork, open a pull request | A repository with no collaborators accepts no pushes from anyone else, on any branch |

- A contributor's brick branch lives in their own fork. Nobody else can touch it, and nobody can
  change `main` or any other branch here. A contributor may also comment on and review other
  people's pull requests.
- Nothing is merged without you. Only you can press **Squash and merge**, so your merge is the
  approval. A contributor's review is advice.
- The ruleset asks for **0 required approvals** on purpose. On a personal repository GitHub does not
  let an author approve their own pull request, so a required approval would block your own merges.
  Do not turn on required approvals or code owner review until a second maintainer exists.
- Checks on a pull request from a fork wait for your approval before they run (the pull request
  shows a button for it). That stops a stranger's workflow change from running on GitHub's machines.
- The ruleset requires the `check` and `pr-rules` checks to be green before **Squash and merge** is
  enabled. The `pr-rules` check also refuses edits to the ledger, the sponsor files and the license
  files from anyone without write access.
- Do not add people under **Collaborators** just so they can contribute. That gives them write
  access. Add someone only when you decide they are a maintainer.

## 4. Domain and email

Wait for the trademark answer first. Then:

1. Buy the domain from a registrar you trust. Cloudflare Registrar charges at cost.
2. Put its DNS on Cloudflare. The website will run on Cloudflare Workers
   ([ADR-0011](decisions/0011-web-framework-and-hosting.md)), and attaching a domain needs the
   nameservers there.
3. In Cloudflare, **Email**, **Email Routing**, create four addresses that forward to a **personal**
   inbox: `conduct@`, `security@`, `sponsors@` and `hello@`. Email Routing was free when this was
   written. Check the pricing page.
4. Send a test to each address from another account and check that it arrives. These addresses are
   already written in [CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md), [SECURITY](../SECURITY.md) and
   [SUPPORT](../SUPPORT.md), so they must work before you announce.
5. Set the repository website (use your real domain):
   ```powershell
   pnpm setup:github --only settings --apply --homepage https://gitpyramid.com
   ```

## 5. Open the review pool

The 4-for-1 rule asks every author to review other open brick pull requests. On day one there are
none, so you open five real ones first, one per sector
([ADR-0007](decisions/0007-review-rule-and-ai-policy.md)). They are ready as local branches named
`brick/...`.

```powershell
git branch --list 'brick/*'
git push origin brick/vitejs-vite brick/prisma-orm brick/grafana-grafana brick/ggml-org-llama.cpp brick/denoland-deno
pnpm setup:github --only pulls --apply
```

(Set the token again as in step 3b first, and remove it after.) Each pull request explains why it is
open. **Do not merge them yet.** They are material for reviewers. Merge one only after it has a
review that names something specific and CI is green, and then admit it (step 6). Keep at least three
open while you are recruiting. When you run low, make more with `pnpm brick:new`. Optionally add the
labels `type/brick` and `needs-review` to each by hand.

## 6. Admit every merged brick

After a brick pull request is merged, a maintainer adds one line to the ledger, which gives the brick
its id. The command works out the next id and looks up GitHub's numeric id, and it refuses if
anything is wrong.

```powershell
git checkout main; git pull
git checkout -b chore/admit-owner-repo
pnpm admit owner/repo --impact 3 --by kush07upadhyay
git add registry/ledger.jsonl
git commit -m 'chore(registry): admit owner/repo as #15'
git push -u origin chore/admit-owner-repo
```

Open the link GitHub prints, create the pull request and merge it. Choose the impact level, 1 to 5,
from the [rubric](SCORING.md#impact-rubric), as your own judgment. A contributor can never set it,
and it is how nobody can rate their own project. Use `--dry-run` to see the line first.

## 7. Before you announce

- [ ] The name decision is made, and a fallback is ready.
- [ ] `conduct@`, `security@`, `sponsors@` and `hello@` each deliver a test email.
- [ ] Step 3 is applied, and Discussions are on.
- [ ] CI is green on `main`.
- [ ] Five review pool pull requests are open.
- [ ] You, or a friend, did the 10 minute path from a fresh account or a private window, using only
      the instructions in the README and CONTRIBUTING. Fix what confused them first.
- [ ] You read the [launch kit](launch/contributor-launch-kit.md) and everything in it is true on the
      day you post it.
- [ ] Your employer check is done.
- [ ] You can be at your keyboard for the first two days.

## 8. After you announce

- **Answer every pull request and issue within 48 hours.** The roadmap's first success measure is a
  median first review under 48 hours, and slow replies are the quickest way to lose contributors.
- Each day: label new issues, merge reviewed pull requests, admit them (step 6), thank people by name.
- Close a submission that is plainly generated and unverified, politely, with the link to
  [the AI policy](decisions/0007-review-rule-and-ai-policy.md). Use the replies in the launch kit.
- Act on [the Code of Conduct](../CODE_OF_CONDUCT.md) quickly. One unanswered rude comment sets the
  tone for everyone.
- Merge the weekly Dependabot pull request after CI is green.
- Write down your measures: external pull requests merged (the target is five or more) and median
  time to first review.

## 9. Money, when you are ready (not before)

Do not take any sponsor money yet. When there is real traffic, follow
[SPONSORSHIP](SPONSORSHIP.md): write the sponsor agreement, talk to a chartered accountant about GST and
invoicing foreign clients, check your employment agreement again, and price the first Founding Steps
low in exchange for a longer term. Sponsor prices wait for about 30 days of real traffic
([PRD OQ-07](PRD.md#13-open-questions)). Sponsorship can never change which bricks exist or how they
rank, and the constitution makes that a rule, so you never have to argue it case by case.

## What could not be done in advance, and what is unproven

- Pushing `main` is done. Signing in elsewhere, buying, emailing and posting need your accounts, so
  none of that was done.
- `pnpm setup:github` has only been run as a dry run against the public repository, because that
  needs no token. Its request shapes were checked against GitHub's own API description, and its
  logic has tests, but the first `--apply` may show a permission message. That is expected and safe
  to repeat.
- The GitHub Actions workflow has been checked against GitHub's schema and rehearsed command by
  command. The `check` job passed on its first run on GitHub on 2026-11-01. The `pr-rules` job also
  passed on the first pull request, a Dependabot one (#1), which touched only a dependency. Its
  refusals (ledger, sponsor and license files, mixed or removed bricks) are proven by tests only, not
  yet by a real stranger's pull request. If a job fails, read the log, fix the cause on a branch and
  open a pull request.
- The 3D monument, search and AI are designed in the specs but not built.
