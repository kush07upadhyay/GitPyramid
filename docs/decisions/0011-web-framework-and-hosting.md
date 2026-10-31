# ADR-0011: Web framework and hosting

Status: Proposed, decision needed before the viewport spec | Date: 2026-11-01 | Deciders: founder | Related: PLAN_REVIEW F-17, F-18, F-19

## Context

The plan says "Next.js static export or Astro" on Cloudflare Pages. Cloudflare now recommends Workers
with static assets for new sites, and Pages is the legacy path. The site needs a 3D app, long-tail
SEO pages for many bricks, a sponsors page, and dynamic routes for stack permalinks and previews.
Constraints: Workers Free allows 20,000 static files per version, 100,000 requests a day and 10 ms
of CPU per request, and the custom domain needs Cloudflare nameservers.

## Decision

**Hosting:** Cloudflare Workers with static assets. Brick pages are served from sharded data by a
Worker, not 50,000 prerendered files.

**Framework (recommended): Astro** with the 3D viewport as a React island.

- Content pages (brick pages, sponsors, docs) ship almost no JavaScript, which protects the
  performance budget everywhere except the monument.
- The monument route loads React Three Fiber only where needed.
- First-class Cloudflare support and server rendering for dynamic routes when required.

## Alternatives considered

- **Next.js with static export:** most familiar to the founder and many contributors, but ships more
  runtime to content pages, and dynamic features need a separate Worker anyway.
- **Vite single-page app plus a Worker:** smallest bundle and full control, but weakest for SEO
  unless the Worker rewrites HTML per route.

## Consequences

If the founder prefers Next.js for familiarity, that is a reasonable override. Record it as an
amendment to this ADR before the first web code is written.
