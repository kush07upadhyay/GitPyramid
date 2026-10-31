# ADR-0010: Project name and the Git trademark policy

Status: Proposed, decision needed before buying the domain | Date: 2026-11-01 | Deciders: founder | Related: PLAN_REVIEW F-01

## Context

The Git Project's trademark policy (git-scm.com/about/trademark) forbids using "Git" as a syllable
in a new word or portmanteau for a third-party product or service. Its example is "Gitpedia".
GitHub and GitLab are exempt through older licenses. "GitPyramid" fits the forbidden pattern.
Enforcement against small projects looks rare, but a forced rename after launch is expensive.

Checked on 2026-11-01: `gitpyramid.com` is unregistered, the `gitpyramid` GitHub handle and the npm
name are free, and the only GitHub repository named GitPyramid is this one. These names were also free
as `.com` and as GitHub handles: `repopyramid`, `repomid`, `sourcepyramid`, `codeziggurat`,
`ossziggurat`, `repoziggurat`, `openziggurat`.

## Options

1. **Keep GitPyramid and ask for permission.** Email trademark@sfconservancy.org with a short
   description. The policy lets Conservancy grant exceptions. Cost: nothing. Risk: a "no", or a
   slow answer.
2. **Rename now.** Cost: a few hours before launch. The repository rename is free and GitHub
   redirects the old URL. Package scope, schema id and README text are a find and replace.
3. **Keep it and accept the risk.** Cheapest today, highest regret if a complaint arrives later.

## Decision

Pending. Recommended order: send the permission email today, do not buy the domain or announce until
there is an answer, and have a fallback name ready. If you choose option 1 or 3, also add the Git
trademark notice next to the GitHub non-affiliation notice.

## Consequences

Everything in the docs uses "GitPyramid" as a working name. The name appears in few places on
purpose, so a rename stays cheap.
