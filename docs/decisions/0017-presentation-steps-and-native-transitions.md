# 0017: Presentation steps and native layout transitions

Status: accepted

## Context

The talk needs presenter-controlled code walkthroughs with synchronized card
motion. Existing slides only navigate entire pages; Arrange demonstrates native
Web Animations but its shuffle geometry belongs to that feature.

## Decision

Keep the client-only Solid presentation and introduce three small concepts:

- A slide owns a mounted body and a count of presenter steps.
- `stepSlide` binds an ordinary component to complete, typed step snapshots.
- `createLayoutTransition` moves persistent elements to measured slot geometry
  with the native Web Animations API. It owns cancellation and cleanup.

There is no additional scene abstraction, animation dependency, global timeline,
or replay-based state machine. The pure navigation function moves through steps
before slides; backward slide navigation lands on the preceding final step.
Restart and the slide selector land on step zero. Embedded controls retain their
native keyboard handling.

The four-card walkthrough uses pure rank/unrank traces. Its presentation frames
contain highlighted lines, watches, pool/output snapshots, and narration. The
displayed code is the educational algorithm with validation omitted, not an
instrumented JavaScript debugger. Permutation indices and arithmetic remain bigint.

Persistent cards live in an overlay above two fixed four-slot trays. Remaining
cards compact left after each transfer, so fixed slot indices show their new
positions. Ranking retains unread input order while its watch exposes the
remaining canonical pool. Processed ranking cards retain input order.

Layout always holds the destination. Motion only interpolates from the previous
on-screen position, including interrupted animations. Resize, restart, reduced
motion, and initial mounting settle immediately. Leaving the slide cancels its
animations and disconnects its observer and media-query listener.

## Consequences

Direct entry and backward stepping do not depend on animation completion or
replaying prior steps. The same model works without motion. Additional visuals
can use ordinary components and typed snapshots without adopting card-specific
types in the presentation runtime.

General timeline seeking, coordinated media, and complex overlapping sequences
remain reasons to evaluate a dedicated animation engine later. This decision
makes no frame-rate or throughput claim.

## Verification

Pure tests cover navigation, four-card snapshots, and rank traces against the
production algorithms, including full-deck bigint precision. Chromium tests cover
card identity, fixed geometry, code/watches, interrupted motion, backward steps,
restart, leaving the slide, reduced motion, live preference changes, resize, and
presentation viewport fit.
