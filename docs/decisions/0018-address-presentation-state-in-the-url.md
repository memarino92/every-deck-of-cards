# 0018: Address presentation navigation in the URL

Status: accepted

## Context

Slide and step state originally lived in a component signal. Refreshing reset
the presentation, and links could not address a walkthrough snapshot.

## Decision

Use router query parameters as the single source of truth: `slide` is a stable
authored ID and `step` is a one-based presenter position. Internal navigation
positions remain zero-based numbers, unrelated to bigint permutation indices.

Next, Prev, restart, and slide selection update both parameters atomically and
create browser history entries without resetting scroll. Reading the reactive
query restores refreshes, direct links, and browser Back/Forward without a second
state mirror or synchronization effect. Unrelated query parameters survive.

Unknown slide IDs select the first slide. Missing, malformed, unsafe, or out-of-
range steps select step one of the addressed slide. Static slides have one step.

## Consequences

Slide links survive inserting or reordering slides. Authored slide IDs are now a
compatibility contract. Step numbers can change when a walkthrough is rewritten.
The address restores presentation snapshots, not arbitrary state in embedded
interactive examples. Initial entry renders the addressed snapshot immediately;
it does not replay its preceding animations.

Pure parsing tests and Chromium refresh, shared-entry, and history tests verify
this behavior alongside the existing navigation and animation tests.
