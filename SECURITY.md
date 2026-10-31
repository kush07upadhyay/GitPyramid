# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a security problem.

1. Use GitHub's private reporting: open the **Security** tab of this repository and choose
   **Report a vulnerability**. This reaches the maintainers privately.
2. Or email **security@gitpyramid.com**.

Include what you found, how to reproduce it, the impact you expect, the affected URL or commit, and
how to reach you. A short, clear report is better than a long one.

## What to expect

These are goals, not guarantees. This is a volunteer project.

- We aim to acknowledge a report within 5 days.
- We aim to share a plan or a fix date within 14 days.
- We prefer coordinated disclosure and ask for 90 days before public details, sooner if a fix ships.
- We credit reporters in the release notes unless they prefer to stay anonymous.
- There is no bug bounty.

## Scope

In scope: this repository and its CI workflows, the registry validator and build tools, the website,
and any Worker or API endpoint the project runs.

Also in scope and treated as security issues: **malicious or poisoned registry content**, such as a
brick whose text tries to instruct the AI Stack Architect, a link to malware, or a sponsor asset
that tries to mislead users.

Out of scope: vulnerabilities in third-party projects that are listed as bricks (report those to the
project itself), social engineering of maintainers, volumetric denial of service, spam, and
automated scanner output without a working proof.

## Safe harbor

Good-faith research is welcome. Please do not access other people's data, do not degrade the
service for others, and do not publish details before we have had a fair chance to fix the problem.
We will not pursue action against researchers who follow these rules.

## Supported versions

Only the current `main` branch and the deployed site are supported.
