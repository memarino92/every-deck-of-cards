# Security Policy

## Reporting a Vulnerability

Please use GitHub private vulnerability reporting for security-sensitive findings. Do not open a public issue containing an undisclosed vulnerability, credential, token, or private user information.

For ordinary defects that do not expose sensitive information, open a normal GitHub issue.

## Secrets

This is a client-only application. Anything shipped to the browser is public, including all `VITE_*` environment variables. The application must not depend on client-side secrets.

Cloudflare credentials are deployment-only values. Store them in protected GitHub environment secrets or ignored local files, and use a narrowly scoped API token.

If a secret is committed, revoke or rotate it immediately. Removing it in a later commit is not sufficient because it remains in Git history.

## Supported Versions

Until the first release, security fixes apply to the current `main` branch only.
