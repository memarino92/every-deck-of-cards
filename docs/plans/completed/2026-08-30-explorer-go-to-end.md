---
title: Explorer go-to-start/end buttons and grouped-digit input
status: completed
created: 2026-08-30
updated: 2026-08-30
owners:
  - human
  - opencode
---

# Goal

Add "go to end" and "go to start" buttons to the explorer that fill the jump
input with the boundary deck number and navigate to it. Along the way, accept
comma/grouped digits in the deck-number input, because every place on the
site that shows the number formats it with commas and today pasting it back
into the input fails to parse.

# Why

- Going to the end of the space is one of the first things a visitor wants to
  do; today it requires typing a 68-digit number by hand. Getting back to
  deck 1 afterwards is the same annoyance in miniature.
- The site displays deck numbers with `toLocaleString` (comma groups), but
  `parseDeckNumberParam` rejects anything that is not bare digits, so
  copy-pasting a displayed number into the jump box silently falls back to
  deck 1. Accepting separators fixes the copy-paste loop.

# Approach

- `src/virtualization/deck-param.ts` — strip comma, space, underscore, and
  apostrophe separators (the common thousands-grouping characters, including
  the narrow no-break space produced by `toLocaleString` in some locales)
  before validating. Validation still requires bare digits afterwards, so
  malformed input still falls back to deck 1.
- `src/ExplorerPage.tsx` — add an `End` button next to Jump/Random that calls
  `navigateTo(publicDeckNumberToIndex(LAST_DECK_NUMBER))`. This fills the
  input with the last deck number, syncs the URL, anchors, and scrolls — the
  same path Jump and Random already use.

# Tests

- `src/virtualization/deck-param.test.ts` — comma-grouped, space-grouped,
  underscore, apostrophe, and narrow-no-break-space inputs parse; embedded
  junk still falls back to deck 1.
- `e2e/explorer-end.spec.ts` — clicking the End button renders the last deck
  (emergent scroll behavior stays under the Playwright oracle).

# Verification

- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build`, `pnpm test:e2e`

# Outcome

Implemented and verified.

- The explorer's jump form has **Go to end** and **Go to start** buttons
  (next to Jump/Random) that fill the input with the boundary deck number,
  sync the URL, anchor, and scroll it into view — reusing the existing
  `navigateTo` path.
- `parseDeckNumberParam` strips grouping separators (comma, space, U+00A0,
  U+202F, underscore, straight/curly apostrophe) before validating, so a
  displayed deck number can be pasted back into the jump box. The period is
  deliberately **not** a separator: `'1.5'` reads as a decimal to most
  visitors and must stay malformed rather than silently becoming fifteen.
- Deviations from the original approach: period dropped from the separator
  set after the `1.5` regression surfaced in unit tests; an oxlint-disable
  comment for the irregular whitespace turned out unnecessary and was
  removed.

# Verification results

- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` — pass.
- `pnpm test` — 131/131 pass (6 new separator-parsing cases).
- `pnpm test:e2e` — 5/5 pass, including the new paste-the-formatted-number,
  go-to-end, and go-to-start button specs.
