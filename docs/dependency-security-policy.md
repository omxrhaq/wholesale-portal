# Dependency Security Policy

Dependency security is enforced in layers:

- Dependabot opens update pull requests for npm packages and GitHub Actions.
- `npm run security:audit` runs `scripts/security-audit.mjs`.
- The Security workflow blocks merges when critical vulnerabilities are present.
- High vulnerabilities block merges unless the exact advisory is explicitly risk-accepted below and the acceptance has not expired.

## Current Blocking Level

The current blocking level is `high`, with documented temporary exceptions only.

Critical findings can never be accepted through this policy. A critical finding must be fixed or the deployment must stop.

## Policy For High Findings

High vulnerabilities are not ignored. They must either be fixed or risk-accepted with all fields below:

- dependency name
- CVE/GHSA id
- severity
- affected path
- reason for temporary acceptance
- expiry date
- owner

Use these rules:

- If the vulnerable package is directly used in production, prioritize the upgrade.
- If the vulnerable path is development-only, document the exposure and upgrade path.
- If `npm audit fix --force` proposes breaking changes, use a dedicated PR and run full CI.
- Expired acceptances block CI.

## Temporary Risk Acceptances

| Dependency | Advisory | Severity | Affected path | Reason | Expiry date | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `esbuild` via `@esbuild-kit/core-utils` / `drizzle-kit` | `GHSA-67mh-4wv8-2f99` | High | `node_modules/@esbuild-kit/core-utils/node_modules/esbuild` | Development-only Drizzle CLI path. `npm audit fix --force` proposes a breaking downgrade of `drizzle-kit`. Production runtime does not execute Drizzle CLI or expose esbuild dev servers. Mitigations: do not expose local dev servers publicly, use lockfile installs in CI, and replace this path when Drizzle removes `@esbuild-kit/esm-loader` or a safe upgrade is available. | 2026-07-15 | Engineering owner |
| `esbuild` via `@esbuild-kit/core-utils` / `drizzle-kit` | `GHSA-gv7w-rqvm-qjhr` | High | `node_modules/@esbuild-kit/core-utils/node_modules/esbuild` | Development-only Drizzle CLI path. The registry integrity risk is mitigated by lockfile installs and standard npm integrity checks, but the underlying advisory remains until the transitive dependency path is removed. | 2026-07-15 | Engineering owner |

## Target State

The target state is zero accepted high vulnerabilities.

Do not lower the gate below `high`. Do not add a high-risk acceptance without an expiry date and owner.
