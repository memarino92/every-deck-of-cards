---
title: Full talk motion and concrete card walkthroughs
status: active
created: 2026-09-01
updated: 2026-09-01
owners:
  - human
  - opencode
---

# Goal

Design the full technical talk's concrete card-based algorithm and architecture walkthroughs, then decide whether Arrange's native Web Animations patterns are sufficient or a shared motion system is justified.

# Non-Goals

- Changing the shipped Arrange interaction or adding a dependency solely for its shuffle.
- Selecting a library before the talk's actual motion requirements and interruption semantics are known.
- Replacing the tested domain examples with hardcoded presentation-only results.

# Context

Arrange proved that keyed card motion, cancellation, and reduced motion can be delivered with the Web Animations API and no dependency. The future talk should reuse concrete cards from `/how` to walk factoradic ranking, worker transport, virtualization, and rendering boundaries. Those sequences may need orchestration beyond Arrange's single endpoint-constrained transition, but that must be demonstrated before adding a shared abstraction or package.

# Dependencies

- Completed Arrange plan and decision 0013.
- The content outline for the full technical talk.
- Existing `/how` examples and tested trace/domain modules.

# Proposed Changes

- Storyboard concrete card transitions for factoradic selection and the explorer architecture.
- Prototype the most demanding sequence with native Web Animations first.
- Compare any candidate library on Solid 2 compatibility, bundle cost, timeline control, interruption, reduced motion, and reuse across talk and documentation modes.
- Record a decision before adopting a motion dependency or shared abstraction.

# Test Plan

- Keep mathematical states sourced from tested domain/trace functions.
- Use Playwright for animation lifecycle, cancellation, reduced motion, and presentation navigation.
- Add accessibility review for non-motion alternatives and narrated state changes.

# Benchmark Plan

- Add a reproducible browser benchmark before making frame-rate or throughput claims.

# Security Considerations

- Review any dependency before adoption; do not add remote scripts or third-party assets.

# Documentation Changes

- Update talk documentation and architecture decisions with the selected motion boundary.

# Tasks

- [ ] Define the full talk outline and concrete card walkthroughs.
- [ ] Prototype the most demanding sequence with native Web Animations.
- [ ] Evaluate whether a dependency or shared abstraction is justified.
- [ ] Record the motion decision and verification evidence.

# Decisions Made

- Arrange's motion decision remains complete and does not force the talk's eventual choice.

# Deviations

None.

# Verification Evidence

Pending.

# Outcome

Pending.

# Related Commits

Pending.
