---
title: Explorer-first home page with pinned controls
status: completed
created: 2026-08-30
updated: 2026-08-31
owners:
  - human
  - opencode
---

# Goal

Make the explorer the home page: a visitor lands on `/` and scrolls down to start browsing decks. A compact hero scrolls away naturally; the explorer controls (deck-number input, Jump, Random, Go to start/end) remain pinned once the hero clears. The footer goes away; a GitHub icon/link replaces the `Foundation · 001` status text in the top-right of the masthead.

# Non-Goals

- The scroll-mechanics rework (separate plan: `2026-08-30-explorer-scroll-model.md`). This plan is layout and routing; whichever lands second rebases. The nested pane may persist until that plan lands.
- Tagline copy changes (separate plan: `2026-08-30-tagline.md`) — this plan shrinks the hero; the tagline plan swaps the words.
- The deck editor (its plan already notes it builds against this layout).

# Context

- Today `/` is a static hero (`HomePage.tsx`) linking to `/explore`; the explorer is a separate route with its own bar. The design direction: no separate landing — the site **is** the explorer, introduced by a small hero that scrolls away.
- The masthead currently shows `Foundation · 001` (a decorative status with no meaning) and the footer holds the GitHub link. Direction: no footer; GitHub icon top-right instead.
- `/explore` becomes a redirect to `/` that preserves the `?deck=` parameter contract (decision 0007's shareable links must not break).

# Dependencies

None hard. Soft overlaps: the scroll-model plan (shares `ExplorerPage.tsx`), the tagline plan (shares hero copy), the deck-editor plan (builds against this layout).

# Proposed Changes

- Routing: `/` renders the explorer experience (hero + feed); `/explore` redirects to `/`, forwarding query params.
- Layout: hero shrinks to a compact intro block (wordmark-scale heading + short tagline + the 52! count) that scrolls away; the explorer controls bar remains pinned at the top of the feed.
- Masthead: replace the `Foundation · 001` status span with a GitHub icon link (inline SVG, `aria-label`, same `rel="noreferrer"`); remove the footer element and its styles; nav loses the now-redundant Home/Explore split as appropriate.
- The old `HomePage.tsx` hero is retired or folded into the new compact intro.

# Test Plan

- e2e: `/explore?deck=N` lands on `/?deck=N` with the right deck rendered; pinned controls remain reachable after scrolling deep into the feed; masthead GitHub link present; no footer rendered.
- Existing explorer specs updated for the new route/markup in the same change.
- Unit tests unchanged except where markup snapshots exist.

# Benchmark Plan

None — layout change, no performance claim.

# Security Considerations

- Inline SVG icon only; no third-party assets or scripts (per repo policy).

# Documentation Changes

- `README.md`: the site description once `/` is the explorer.
- `docs/architecture.md` if the page/route inventory is described there.

# Tasks

- [x] Merge explorer into `/` with compact hero and pinned controls header.
- [x] Redirect `/explore` preserving `?deck=`.
- [x] Masthead GitHub icon; remove footer and `Foundation · 001`.
- [x] Update e2e specs; run all quality gates plus `pnpm test:e2e`; record evidence.

# Decisions Made

- The site leads with the explorer; there is no separate marketing-style landing page.

# Deviations

- 2026-08-31: Decision 0009's virtual-position model remains the feed's scroll
  authority, but the first implementation still used native document scrolling
  for the intro and therefore exposed both browser and custom rails. The revised
  model disables document scrolling and prepends a finite intro offset to the
  deck position, making hero and feed one continuous viewport-owned surface.
- 2026-08-31: A legacy link with `?deck=` starts with the finite intro already
  cleared after the replace redirect so an addressed deck remains the immediate
  destination.

# Verification Evidence

- 2026-08-31: `vp check` passed (104 files formatted; 48 files linted
  without warnings or errors).
- 2026-08-31: `pnpm typecheck` passed.
- 2026-08-31: `vp test run` passed (12 files, 148 tests).
- 2026-08-31: `vp build` passed (client and server bundles).
- 2026-08-31: `pnpm test:e2e` passed (21 Chromium tests), including
  legacy-route redirection, pinned full-page controls, single-surface wheel and
  touch continuity with no document scroll, mobile-width layout, fling distance,
  animated navigation, custom rail, and both ends of the permutation space.

# Outcome

The site now opens directly into a compact introduction and full-page explorer
that share one viewport-owned scroll state. Its pinned controls and virtual feed
preserve decision 0009's exact bigint position model while removing both the
framed nested-pane presentation and native browser scroll rail. Legacy
`/explore?deck=N` links replace-redirect to `/?deck=N`, the footer and decorative
status are gone, and source access lives in the masthead GitHub icon.

# Related Commits

- `feat(home): make explorer the home page`
