# 0016: Pin the Solid RC.7 transitive runtime

- Status: accepted
- Date: 2026-09-11

## Context

Solid RC.7 declares `@solidjs/signals` with a caret prerelease range. Once
RC.8 was published, a fresh install of the otherwise exact RC.7 dependency
set resolved RC.8. That version is incompatible with RC.7's development
runtime diagnostics API, preventing every UI test from loading.

## Decision

Use a pnpm override that resolves `@solidjs/signals` exactly to `2.0.0-rc.7`
while the application remains on the Solid RC.7 line.

## Alternatives Considered

- Leave the caret resolution unconstrained: invalid because fresh installs and
  CI crash before the tests run.
- Advance every Solid package to RC.8: outside this Dependabot update set and
  requires a separate compatibility review.

## Consequences

The RC.7 packages stay reproducible and testable. The override must be
removed or deliberately revised when Solid is upgraded beyond RC.7.

## Evidence

With RC.8 signals resolved transitively, `solid.dev.js` fails while invoking
`DEV.diagnostics.setConsoleFooter`. Pinning RC.7 restored all 165 unit tests,
formatting, linting, type checking, and the production build.

## Related Material

- [Dependabot compatibility plan](../plans/active/2026-09-11-dependabot-compatibility.md)
- [Solid 2 RC line](0010-solid-2-rc-line.md)
