# Architecture

## Goal

Address and render any of the `52!` orderings of a standard deck without enumerating or storing the permutation space.

## Boundaries

- `domain`: pure TypeScript for cards, factorials, permutation ranking, injected-entropy random selection, and magnitude calculations
- `platform`: narrow browser adapters for Web Crypto entropy, reduced motion, and keyboard ownership
- `worker`: typed messages, stale-response suppression, batching, and transferable card buffers
- `virtualization`: holds the explorer's scroll position as a `bigint` virtual position and maps it to a bounded rendered strip
- `navigation`: deck query normalization and history synchronization; features choose commit timing
- `motion`: scalar momentum integration with feature-provided movement and bounds
- `explorer`: exact-position controller, browser input/measurement, worker-backed row resource, and focused controls/feed/rail rendering
- `arrange`: deck transactions, explicit spread geometry, pointer sessions, shuffle animation, and focused controls/card rendering
- `examples` and `presentation`: shared walkthrough state and widgets, composed into article sections or slides with scoped navigation
- `cards` and `ui`: shared spread placement, card-face styling, design tokens, native action styles, and neutral article layout
- route components and `Layout`: feature coordination, content composition, navigation, and explicit viewport ownership
- `deployment`: immutable static assets served by Cloudflare without an application Worker

The domain cannot depend on the other layers. Rendering receives compact card IDs and does not implement permutation mathematics.

Decision [0014](decisions/0014-ui-feature-ownership.md) documents the UI contracts and their lifetimes. Styles are colocated with their feature or shared owner; the root stylesheet only orders imports. Rendering components receive semantic values/actions or explicit element-registration callbacks, rather than discovering another component's DOM structure.

## Indexing

Public numbers are one-based because they are labels for people: deck `1` through deck `52!`. Domain algorithms use zero-based indices because factoradic ranking naturally spans `0` through `52! - 1`.

All indices use `bigint`. JavaScript `number` cannot exactly represent this range.

## Rendering

The browser cannot create a scroll area with `52!` rows. The home page is one viewport-owned scroll surface: a finite pixel offset moves its compact introduction away, then the existing `bigint` virtual position (the deck under the feed viewport's top edge plus a sub-row pixel offset) advances through the permutation space. Wheel, keyboard, touch, and scrollbar-rail input drive that unified state while native document scrolling stays disabled. A bounded strip of rows — visible plus small overscan — follows the deck position, and a custom scrollbar rail maps percent-of-space back to an exact integer position. Only the strip's rows exist in memory or the DOM; deck numbers render synchronously while card faces load asynchronously from the worker.

## Computation

Pure ranking and unranking functions and the injected-entropy random-index algorithm are directly testable. The explorer requests contiguous batches from a Web Worker. Results use flat typed arrays and transferable buffers to avoid cloning card objects.

The row resource validates and decodes that transport into card-ID rows, evicts rows outside the bounded strip, and ignores superseded responses. Cancellation is distinct from failure. A worker failure exposes a retry action that creates a fresh source while deck labels remain synchronous.

Because the explorer walks adjacent indices, batch production unranked the first deck fully and then steps deck-to-deck with the domain's in-place `nextPermutation` (index `i` → `i + 1`) rather than re-running the factoradic unrank per deck. Random access by deck number still unranked directly, so the rank/unrank bijection remains the authority.

## Arrange

`/arrange` owns one local 52-card ordering and ranks it synchronously on the main thread; unlike the scrolling explorer, it neither batches decks nor uses the worker. Canonical position zero is the rightmost, topmost card. The internal permutation index remains zero-based `bigint`; public labels and the shared `?deck=` query contract remain one-based. Initial links unrank the requested deck, settled interactions update the URL once, and Back/Forward restores earlier orderings.

Mouse and pen dragging reorder live. Touch arbitrates among tap-to-move, manual horizontal panning with bounded release momentum, and long-press dragging; keyboard activation uses the same select-then-insert buttons. A platform-independent rejection-sampling algorithm draws an unbiased target from injected bytes, while `src/platform/crypto-entropy.ts` supplies Web Crypto in production. The UI animates old card slots to the exact target with the Web Animations API, handles cancellation, and settles immediately for reduced motion. No explorer worker, HTML drag-and-drop package, or motion package participates. Decision 0013 records the durable interaction model.

## Documentation

Technical documentation is part of the application and reusable in a full-screen talk mode. The shipped pieces are a `/why` page answering "how does this work and why does it exist," an interactive factoradic explainer that walks decks of 2 through 5 cards before extrapolating to 52, the current `/talk` presentation, and `/arrange` as an executable rank/shuffle demonstration. Durable plans and architecture decisions remain readable Markdown in the repository. Claims about scale or performance must expose assumptions, sources, and reproducible calculations; explainer content computes its tables and examples from the tested domain at render time rather than hardcoding results.

## Deployment

Vite produces deployable static assets in `dist/client`. Cloudflare Workers Static Assets serves them directly with SPA fallback and security headers. There is no server-rendering path, API, or application Worker invocation.
