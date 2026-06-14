# Dependency Security Policy

Dependency security is enforced in layers:

- Dependabot opens update pull requests for npm packages and GitHub Actions.
- `npm run security:audit` runs `npm audit --audit-level=critical`.
- The Security workflow blocks merges when critical vulnerabilities are present.

## Current Blocking Level

The current blocking level is `critical`.

This is intentional for now. `npm audit --audit-level=high` currently reports high vulnerabilities in transitive dependencies, including Next.js and build-tool dependencies, where automatic fixes may require framework upgrades or breaking dependency changes. Blocking all high findings immediately would make the security gate noisy until those upgrades are handled in dedicated dependency PRs.

## Policy For High Findings

High vulnerabilities are not ignored. They must be triaged through normal issue/PR work:

- If the vulnerable package is directly used in production, prioritize the upgrade.
- If the vulnerable path is development-only, document the exposure and upgrade path.
- If `npm audit fix --force` proposes breaking changes, use a dedicated PR and run full CI.
- Once high findings are under control, raise `security:audit` to `npm audit --audit-level=high`.

## Target State

The target state is to block at `high` severity after the current high findings are resolved or explicitly risk-accepted.

Do not lower the gate below `critical`.
