# 0001: Use client-only SolidJS and Vite

- Status: accepted
- Date: 2026-08-27

## Context

Every deck is generated deterministically from public input. The product requires no private data, database, request-time API, authentication, or server rendering. Rendering and computation performance matter, and domain logic must remain separate from presentation.

## Decision

Build a client-only SolidJS application with strict TypeScript and Vite. Deploy Vite's output as Cloudflare Workers Static Assets without an application Worker script.

## Alternatives Considered

- SolidStart offers routing and server capabilities that are not currently needed. It would enlarge the deployment and conceptual surface.
- Server rendering would spend runtime resources generating a shell whose meaningful content depends on client-side scrolling and worker computation.
- A framework-free UI would reduce dependencies but make the documentation, controls, and finely updated virtual feed less ergonomic to maintain.

## Consequences

The application can be served entirely from Cloudflare's asset infrastructure. Browser compatibility and accessibility require explicit testing. If future requirements introduce private or request-time data, that server boundary will require a new decision.

## Evidence

The initial production build and tests are recorded in the repository foundation execution plan.

## Related Material

- [Architecture](../architecture.md)
- [Repository foundation plan](../plans/completed/2026-08-27-repository-foundation.md)
