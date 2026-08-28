---
title: Prepare the production launch contract
status: completed
created: 2026-08-28
updated: 2026-08-28
owners:
  - human
  - opencode
---

# Goal

Make the current client-only application safe and intentional to deploy at `https://everydeckof.cards/`, give shared links a compelling social preview, and establish a semantically meaningful canonical deck before public deck numbers are released.

# Non-Goals

- Deploying without explicit approval and Cloudflare credentials.
- Adding a server runtime, analytics, remote assets, or application features.
- Redirecting an unconfirmed `www` hostname.

# Context

The repository already uses Cloudflare Workers Static Assets through the recommended `wrangler.jsonc` format. The existing canonical sequence was selected for implementation simplicity, but public deck numbers have not yet been exposed by the foundation UI and can still adopt a recognizable US Playing Card Company-style new-deck arrangement.

# Dependencies

- Wrangler 4.127.0 and the existing Cloudflare account/zone.
- The `everydeckof.cards` custom domain must be available in that account.
- Social crawlers must be able to fetch a static 1200 by 630 image without authentication.

# Proposed Changes

- Configure the assets-only Worker to use `everydeckof.cards` as its production custom domain while retaining SPA fallback behavior.
- Add canonical URL, Open Graph, and Twitter card metadata with an original local social image.
- Preserve zero-based card IDs but define `CANONICAL_DECK` in the project's adopted USPCC-style new-deck order, viewed face-to-back and excluding jokers and advertising cards.
- Supersede the existing canonical-order decision and update project documentation.

# Test Plan

- Assert every canonical card appears exactly once and the four suit runs match the documented new-deck order.
- Run domain tests and a production build.
- Inspect generated HTML and social-image dimensions.
- Run Wrangler's deployment dry run.
- Run all repository quality gates.

# Benchmark Plan

No performance claim or algorithm change is included, so no new benchmark is required.

# Security Considerations

- Keep the application assets-only with no bindings, secrets, remote scripts, or third-party content.
- Preserve the existing restrictive response headers.
- Use only absolute HTTPS URLs in public social metadata.

# Documentation Changes

- Add a superseding architecture decision for canonical new-deck order.
- Document the production domain and Wrangler JSONC source of truth in the README.

# Tasks

- [x] Inspect the current branch, deployment config, metadata, and canonical ordering.
- [x] Create `feat/production-launch` from current `main`.
- [x] Configure and document production routing.
- [x] Add and validate social metadata and artwork.
- [x] Change and test canonical new-deck order.
- [x] Complete specialist reviews and all quality gates.
- [x] Record evidence and move this plan to `completed/`.

# Decisions Made

- Retain `wrangler.jsonc`; Cloudflare recommends it for new projects and duplicating it with `wrangler.toml` would create ambiguity.
- Adopt a commonly reported USPCC-style sequence from the face: spades and diamonds ascending, then clubs and hearts descending. Jokers and advertising cards are outside this standard 52-card domain; the project does not claim a universal manufacturer standard.
- Preserve card IDs so card identity remains stable; only permutation ordering and therefore public deck-number meaning changes.

# Deviations

- The initial implementation used ES2023 non-mutating array helpers in response to lint guidance. TypeScript's ES2022 library correctly rejected them, so canonical reversal uses explicit index selection without widening browser requirements.
- Review prompted stronger full-map card-ID assertions, more precise social copy, and qualification of the secondary source for the adopted USPCC-style order.

# Verification Evidence

- `pnpm.cmd format:check`: passed with all files formatted.
- `pnpm.cmd lint`: passed with zero warnings and zero errors across 196 rules.
- `pnpm.cmd typecheck`: passed under the ES2022 application contract.
- `pnpm.cmd test`: passed 59 tests across five files, including canonical-order boundaries, complete stable card IDs, and exhaustive permutation round trips through eight values.
- `pnpm.cmd build`: passed; Vite emitted the client bundle and all public metadata assets.
- `pnpm.cmd exec wrangler deploy --dry-run`: read eight static assets, found no bindings, and exited without deployment.
- `git diff --check`: passed.
- The 1200 by 630 PNG was generated from the repository SVG with local headless Chrome and visually inspected for content, contrast, and cropping.
- Domain follow-up review found no remaining findings. Documentation review's wording finding was corrected; only post-deployment crawler and header checks remain. Security review found no source-level findings and documented operational DNS, credential-scope, HSTS, and rollback checks for deployment.

# Outcome

The branch is ready for an explicitly approved production deployment. It retains Cloudflare's recommended JSONC configuration, targets the apex custom domain as an assets-only SPA, publishes complete social metadata and local artwork, and establishes a tested new-deck canonical sequence before public deck-number links ship. No production deployment occurred as part of this plan.

# Related Commits

- `aefe16a` - `feat(launch): prepare production deployment`
