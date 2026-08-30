# 0008: Verify emergent scroll behavior end to end with Playwright

- Status: accepted
- Date: 2026-08-29

## Context

The explorer's end-of-space behavior is **emergent**: it arises from the interaction between the browser's real scroll physics (`scrollTop` clamping at the content boundary, wheel-event cadence) and the virtualization math (`recenteredAnchor`, `windowStart`, anchor clamping). That interaction cannot be reproduced faithfully by pure-TypeScript unit tests or hand-rolled scroll simulations — during the end-of-space investigation, multiple simulations contradicted each other depending on how browser input was modeled, and only a real browser produced trustworthy numbers.

The project had no browser-level test harness; `pnpm test` runs vitest unit and component tests only.

## Decision

Add Playwright (`@playwright/test`) as the end-to-end harness for behavior that is emergent between the browser and the virtualization layer. Playwright drives the real dev server (`vite`) in Chromium against `http://localhost:5173`, configured in `playwright.config.ts` with `webServer` auto-start, a single worker, and the `list` reporter. The `pnpm test:e2e` script runs the `e2e/` specs.

Reserve e2e for genuinely emergent behavior (scroll-to-end, escape-from-end, jump-to-deck rendering). Keep deterministic logic — permutation math, window/anchor arithmetic, deck-number parsing — in fast vitest unit tests; e2e is the oracle of last resort, not the default.

## Alternatives Considered

- **More unit/scroll simulations.** Rejected as the oracle: they cannot model browser `scrollTop` clamping and event cadence, and produced mutually contradictory answers during the investigation.
- **Component tests via `@solidjs/testing-library`.** These run in a simulated DOM without real scroll physics, so they cannot reproduce the boundary-clamping interaction that caused the bug.
- **No e2e; manual verification only.** Rejected: the end-of-space regression is subtle, was fixed once and nearly re-broken, and needs a repeatable guard.

## Consequences

- A reproducible oracle now exists for the end-of-space regression: `e2e/explorer-end.spec.ts` asserts the last deck is reachable both by jumping (search box) and by scrolling, and that scrolling back up escapes the end zone.
- E2e runs a real browser and dev server, so it is slower and heavier than vitest; it is a separate script, not part of `pnpm test`, and is run deliberately before commits that touch scroll/virtualization.
- The dev-server lifecycle, browser install (`playwright install`), and single-worker serialization are new operational considerations for contributors.

## Evidence

- `e2e/explorer-end.spec.ts` — passes after the `windowStart`/`clampAnchor`/deadband fix; failed before it (stuck ~12 decks short at `…988`).
- Diagnosis and fix verified against this harness; see the explorer end-of-space plan.

## Related Material

- [Explorer worker batching and virtualization](0007-explorer-worker-batching-and-virtualization.md)
- [Explorer end-of-space plan](../plans/completed/2026-08-29-explorer-end-of-space.md)
