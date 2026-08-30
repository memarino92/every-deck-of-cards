---
title: Explorer-first home page with sticky controls
status: active
created: 2026-08-30
updated: 2026-08-30
owners:
  - human
  - opencode
---

# Goal

Make the explorer the home page: a visitor lands on `/` and scrolls down to start browsing decks. A compact hero scrolls away naturally; the explorer controls (deck-number input, Jump, Random, Go to start/end) live in a sticky header that stays pinned while the feed scrolls. The footer goes away; a GitHub icon/link replaces the `Foundation · 001` status text in the top-right of the masthead.

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
- Layout: hero shrinks to a compact intro block (wordmark-scale heading + short tagline + the 52! count) that scrolls away; the explorer controls bar becomes `position: sticky` at the top of the feed.
- Masthead: replace the `Foundation · 001` status span with a GitHub icon link (inline SVG, `aria-label`, same `rel="noreferrer"`); remove the footer element and its styles; nav loses the now-redundant Home/Explore split as appropriate.
- The old `HomePage.tsx` hero is retired or folded into the new compact intro.

# Test Plan

- e2e: `/explore?deck=N` lands on `/?deck=N` with the right deck rendered; sticky controls remain reachable after scrolling deep into the feed; masthead GitHub link present; no footer rendered.
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

- [ ] Merge explorer into `/` with compact hero and sticky controls header.
- [ ] Redirect `/explore` preserving `?deck=`.
- [ ] Masthead GitHub icon; remove footer and `Foundation · 001`.
- [ ] Update e2e specs; run all quality gates plus `pnpm test:e2e`; record evidence.

# Decisions Made

- The site leads with the explorer; there is no separate marketing-style landing page.

# Deviations

None yet.

# Verification Evidence

Pending.

# Outcome

Pending.

# Related Commits

Pending.
