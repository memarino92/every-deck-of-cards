# 0010: Track the Solid 2.0 release-candidate line

- Status: proposed
- Date: 2026-08-30

## Context

Solid 2.0 is in release candidate (`solid-js@2.0.0-rc.4` on the npm `next` dist-tag, with matching RC lines for `@solidjs/router`, `vite-plugin-solid`, and `@solidjs/testing-library`). The project pins the 1.x line. This is a greenfield project with no legacy support burden, and the AGENTS.md toolchain policy already prefers current releases.

## Decision

Upgrade to the Solid 2.0 RC line now and track RC revisions until GA. While pre-release, versions are pinned exactly (no semver range) and each RC bump runs the full quality gates plus the e2e suite.

## Alternatives Considered

- **Wait for 2.0 GA.** Safest, but the app is pre-launch and small; upgrading now spreads the API-drift cost across a tiny codebase and avoids building the upcoming explorer rework and deck editor on a line that will be upgraded under them.
- **Stay on 1.x indefinitely.** Conflicts with the toolchain policy and strands the project on a maintenance line.

## Consequences

- Pre-release risk is accepted: RC bumps may carry breaking changes; pinning plus the test/e2e suites is the mitigation.
- All new UI code (explorer rework, deck editor) targets 2.0 APIs from the start.
- Dependabot/CI should treat Solid RC bumps as first-class updates, not noise.

## Evidence

- npm dist-tags inspected 2026-08-30: `solid-js next = 2.0.0-rc.4`, `@solidjs/router next = 2.0.0-next.19`, `vite-plugin-solid next = 3.0.0-next.27`, `@solidjs/testing-library next = 1.0.0-beta.2`.
- Upgrade verification evidence: recorded in the plan.

## Related Material

- Plan: `docs/plans/active/2026-08-30-solid-2-rc-upgrade.md`.
