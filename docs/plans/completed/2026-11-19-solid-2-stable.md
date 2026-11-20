# Upgrade to stable Solid 2

- Upgrade the runtime, renderer, router, compiler integration, and DOM test helper.
- Remove the prerelease signals override and regenerate the pnpm lockfile.
- Preserve client rendering in start mode and verify the build and browser behavior.

## Changes

- Upgraded Solid, the renderer, and signals to 2.0.3, the router to 2.0.0,
  and the Vite plugin to 3.0.1. The Solid 2-compatible test helper is still
  published on its `next` tag, currently 1.0.0-rc.2.
- Updated pnpm within the existing major version to 10.34.9. CI reads the
  version from `packageManager`.
- Replaced the Vite plugin's removed `hot: false` option with
  `refresh: false` in Vitest. App code required no API changes.
- Recorded the stable dependency policy in
  [decision 0017](../../decisions/0017-use-stable-solid-2.md).

## Verification

- `vp check`, `pnpm typecheck`, and `vp test run` passed. All 176 unit
  tests passed.
- `vp build` passed. `dist/client/index.html` contains the document
  metadata and client module entry, with an empty body for the client mount.
- All 85 Chromium tests passed via `pnpm test:e2e`.
- Solid's development diagnostics reported `EFFECT_RELAY_TEAR` in
  `createExplorerPosition.stripStart` during jumps and resizes. The affected
  Playwright tests passed with the existing scroll reconciliation logic.
