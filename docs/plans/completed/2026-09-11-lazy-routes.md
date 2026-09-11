# Lazy secondary routes

## Intent

Keep the growing talk off the initial explorer load. Preserve static client rendering and mount only the active slide.

## Findings and decisions

- Clean worktree at start. All page modules were statically imported by the entry; the worker and framework internals already had separate chunks.
- Baseline production entry: 107.33 kB JavaScript (38.80 kB gzip), 16.15 kB CSS (4.12 kB gzip).
- Use the installed Solid 2 `lazy` named-export API and `Loading` boundaries. Keep Home and Layout eager; load secondary page modules on demand.
- Move presentation-only CSS into the talk module. Shared and other existing styles retain their current cascade.
- Presentation already uses a keyed active-slide factory; inactive slide bodies are not mounted. Keep its shared walkthrough state across slide changes.

## Work and verification

- [x] Inspect routing, slide lifetime, local Solid APIs, and baseline build.
- [x] Add lazy route imports, loading states, and deferred presentation CSS.
- [x] Add browser coverage for deferred requests, delayed loading, and active slide rendering.
- [x] Run quality gates and browser suite; inspect production chunk graph.
- [x] Record final evidence and complete this plan.

## Evidence and deviations

- Production manifest identifies all five secondary pages as dynamic entries. Following only `imports` from `src/entry-client.tsx` excludes Talk, its examples, and its stylesheet. Generated HTML preloads only that static graph.
- Initial static JavaScript totals about 89.4 kB (35.1 kB gzip summed per file), versus the baseline 107.33 kB (38.80 kB gzip). This includes the entry, web, routing, cards, deck-number, and factorial chunks; comparing entry files alone would exaggerate the reduction. The worker and optional framework dynamic imports are excluded in both measurements.
- Talk's own chunk is 2.97 kB (1.47 kB gzip), plus shared dependencies as needed; its deferred stylesheet is 0.76 kB (0.40 kB gzip). Initial CSS is 15.38 kB (3.97 kB gzip). These are build sizes, not runtime speed benchmarks.
- Reproduce with `pnpm build`: inspect `dist/client/.vite/manifest.json`, recursively follow the entry's `imports` (not `dynamicImports`), sum unique files' byte lengths, and sum `node:zlib` `gzipSync` lengths per file. Check `dist/client/index.html` for eager stylesheet and module preload links.
- Typecheck/build, `vp check`, and all 165 unit tests passed. The focused lazy-route and walkthrough browser tests passed.
- Browser tests that send keys or synchronously measure geometry immediately after document load now wait for the lazy route's focused presentation or visible card. The first full run exposed the Arrange geometry readiness assumption and also an Explorer history failure during the run in which source edits occurred. The settled-source full rerun passed all 61 browser tests, including Explorer history.

## PR integration

- The user requested a PR. The original `codex/ui-boundaries` branch had already been squash-merged. Created `codex/lazy-routes` from current `origin/main` (`29cdf38`), carrying only this change. Main differed from the starting source solely in dependency versions and the lockfile.
- Installed main's frozen lockfile and repeated verification. The size comparison above uses the original dependencies on both sides. With main's newer Solid/router packages, the final static JavaScript graph is 91,058 bytes (35,638 bytes gzip summed per file), still excluding Talk and shared examples. The final Talk chunk is 2.96 kB (1.47 kB gzip); CSS sizes are unchanged.
- Final checks on current main: `vp check`, `pnpm typecheck`, 165 unit tests, production build, and all 61 Playwright tests passed.
