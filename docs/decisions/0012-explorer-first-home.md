# 0012: The home page is the explorer

- Status: accepted
- Date: 2026-08-30

## Context

The site currently opens on a static hero page (`/`) that links to the explorer (`/explore`) — a marketing-style landing in front of the thing visitors came for. The explorer itself sits in a nested scroll pane, so even after navigating there, the page chrome stays bolted on screen and the feed scrolls inside a box. The intended experience is closer to everyuuid.com: you arrive, you scroll, you are already browsing decks.

## Decision

The explorer is the home page. `/` renders a compact hero (wordmark-scale heading, short tagline, the 52! count) that scrolls away with the feed; the explorer controls (deck-number input, Jump, Random, Go to start/end) live in a sticky header that remains pinned while the feed scrolls. `/explore` becomes a redirect to `/` that preserves the `?deck=` parameter contract established in decision 0007. The footer is removed; a GitHub icon link replaces the decorative `Foundation · 001` status text in the masthead's top-right corner.

## Alternatives Considered

- **Keep the landing page.** Rejected: it adds a click between arrival and the exhibit, and the hero's job (name, premise, scale) fits in a compact block that can scroll away.
- **Explorer at `/explore`, hero-only `/`.** The status quo; rejected for the same reason.
- **Keep the footer for the GitHub link.** Rejected: a single top-right icon carries the link with less chrome; nothing else lives in the footer.

## Consequences

- Shareable `?deck=` links keep working through the redirect; any spec or doc referencing `/explore` is updated in the same change.
- The deck editor and any future pages build against the sticky-header layout.
- Independent of the scroll-model decision (0009): this decides _where_ the explorer lives and its chrome; 0009 decides _how_ it scrolls.

## Evidence

- `e2e/explorer-home.spec.ts` verifies the legacy redirect, sticky controls,
  masthead GitHub link, footer removal, and full-page feed behavior.
- The complete Playwright explorer suite verifies that the existing
  virtual-position scroll, rail, navigation, and end-of-space behavior remains
  intact on the home route.

## Related Material

- Plan: `docs/plans/completed/2026-08-30-explorer-first-home.md`.
- Decisions 0007 (deck-number URL contract), 0009 (scroll model).
