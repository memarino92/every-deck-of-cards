# Architecture

## Goal

Address and render any of the `52!` orderings of a standard deck without enumerating or storing the permutation space.

## Boundaries

- `domain`: pure TypeScript for cards, factorials, permutation ranking, curated decks, randomness, and magnitude calculations
- `worker`: typed messages, cancellation, batching, and transferable card buffers
- `virtualization`: holds the explorer's scroll position as a `bigint` virtual position and maps it to a bounded rendered strip
- `ui`: Solid components, navigation, controls, documentation, and talk mode
- `deployment`: immutable static assets served by Cloudflare without an application Worker

The domain cannot depend on the other layers. Rendering receives compact card IDs and does not implement permutation mathematics.

## Indexing

Public numbers will be one-based because they are labels for people: deck `1` through deck `52!`. Domain algorithms will use zero-based indices because factoradic ranking naturally spans `0` through `52! - 1`.

All indices use `bigint`. JavaScript `number` cannot exactly represent this range.

## Rendering

The browser cannot create a scroll area with `52!` rows. The explorer's scroll position is application state: a `bigint` virtual position (the deck under the viewport's top edge plus a sub-row pixel offset) that wheel, keyboard, touch, and scrollbar-rail input advance directly. A bounded strip of rows — visible plus small overscan — follows the position, and a custom scrollbar rail maps percent-of-space back to an exact integer position. Only the strip's rows exist in memory or the DOM; deck numbers render synchronously from the position while card faces load asynchronously from the worker.

## Computation

Pure ranking and unranking functions will be directly testable. The UI will request contiguous batches from a Web Worker. Results will use flat typed arrays and transferable buffers to avoid cloning card objects.

Because the explorer walks adjacent indices, batch production unranked the first deck fully and then steps deck-to-deck with the domain's in-place `nextPermutation` (index `i` → `i + 1`) rather than re-running the factoradic unrank per deck. Random access by deck number still unranked directly, so the rank/unrank bijection remains the authority.

## Documentation

Technical documentation will be part of the application and reusable in a full-screen talk mode. The first shipped pieces are a `/why` page answering "how does this work and why does it exist" and an interactive factoradic explainer that walks the ranking algorithm with decks of 2 through 5 cards before extrapolating to 52. Durable plans and architecture decisions remain readable Markdown in the repository. Claims about scale or performance must expose assumptions, sources, and reproducible calculations; explainer content computes its tables and examples from the tested domain at render time rather than hardcoding results.

## Deployment

Vite produces static assets in `dist/`. Cloudflare Workers Static Assets serves them directly with SPA fallback and security headers. There is no server-rendering path, API, or application Worker invocation.
