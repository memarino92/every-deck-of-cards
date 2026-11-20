# 0017 Use stable Solid 2

- Status: accepted
- Date: 2026-11-19

The [Solid 2 release](https://www.solidjs.com/blog/solid-2-0-the-long-hold/)
ends the release-candidate tracking period. Pin Solid and its DOM renderer to
2.0.3, the router to 2.0.0, and the Vite plugin to 3.0.1. Use testing-library
1.0.0-rc.2, the Solid 2-compatible release on its `next` tag.

Remove the prerelease signals override. The stable runtime requires
`@solidjs/signals` at `^2.0.3`, and the lockfile resolves it to 2.0.3.
Keep start mode in client posture with the authored entry and deploy the
static files from `dist/client`.

This supersedes [the Solid 2 RC policy](0010-solid-2-rc-line.md) and
[the RC signals override](0016-pin-solid-rc-transitive-runtime.md).
