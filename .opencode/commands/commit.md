---
description: Verify and create one requested conventional commit
agent: build
---

The user explicitly requests a commit for: $ARGUMENTS

Inspect `git status`, the complete diff, and recent history. Run relevant verification, stage only cohesive intended files, and create one Conventional Commit. Never amend, push, skip hooks, or include unrelated changes. Return the commit hash and verification summary.
