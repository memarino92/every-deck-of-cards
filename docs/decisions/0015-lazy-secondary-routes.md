# 0015: Load secondary routes on demand

- Status: accepted
- Date: 2026-09-11

## Context

Static imports in the client entry put all pages, including the growing conference talk, in the initial application graph.

## Decision

Keep Home and the site layout eager. Use Solid `lazy` dynamic imports for Talk, How, Why, Arrange, and the card development page. Use `Loading` boundaries for direct navigation and the layout content slot. Let Vite extract shared dependencies; avoid manual vendor chunk rules.

Import presentation-only CSS from Talk rather than the global stylesheet. Keep talk-only future animations, assets, and slide modules reachable through that lazy boundary. Do not add an eager barrel import or unconditional preload for Talk.

The presentation continues to mount only the current slide through its keyed body factory. State intentionally shared across slides can live at the talk level, but animation effects and cleanup belong to the mounted slide. Consider per-slide dynamic imports when individual slides acquire substantial dependencies; route splitting currently defers the entire talk together.

## Consequences

Secondary routes require an asynchronous first load. Shared examples can still load on How and be reused by Talk. Code splitting does not by itself reduce total application bytes or guarantee animation performance. Other feature styles retain the existing global cascade; only presentation styles are deferred in this change.

The production application remains client rendered and deployable as static assets. Browser regression coverage checks deferred talk requests, a delayed direct visit, and a single mounted slide; production build inspection verifies emitted chunk boundaries.
