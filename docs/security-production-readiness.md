# Security Production Readiness

This report tracks the P0 blockers that must be closed before a public production launch.

## P0 Status

| P0 | Status | Evidence | Remaining manual work |
| --- | --- | --- | --- |
| Branch protection verification | Technically not enforceable from repo code | `docs/branch-protection.md` and `.github/BRANCH_PROTECTION_REQUIRED.md` define the exact settings and required checks. | A GitHub repository admin must enable branch protection or rulesets for `main`. |
| Required checks block merge | Technically not enforceable from repo code | Required check names are documented in `.github/BRANCH_PROTECTION_REQUIRED.md`. | Mark every required CI and Security job as required in GitHub. |
| CodeQL/code scanning blocks merge | Technically not enforceable from repo code | `.github/workflows/security.yml` runs CodeQL. `docs/branch-protection.md` documents code scanning merge blocking. | Enable code scanning protection rules for high/critical alerts where the repository plan supports them. |
| Production-grade distributed rate limiting | Solved in repo code | `lib/security/rate-limit.ts` uses an Upstash-compatible Redis adapter in production and fails closed when config is missing. | Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production. |
| High dependency vulnerabilities | Risk accepted | `npm run security:audit` blocks critical and unaccepted high findings. The remaining high esbuild advisories are documented in `docs/dependency-security-policy.md` with expiry `2026-07-15`. | Replace the accepted Drizzle/esbuild transitive path before the expiry date or renew through an explicit security review. |
| Runtime DB tenant-isolation tests | Solved for server-side authorization boundary | `tests/security/tenant-isolation/runtime-tenant-isolation.test.ts` creates tenant A/B data and verifies cross-tenant reads/mutations are rejected through services. | True Supabase API/RLS session tests are still a gap until CI can run a Supabase-auth-compatible local stack. |

## Required GitHub Settings

Configure either branch protection rules or repository rulesets for `main`:

- Require a pull request before merging.
- Block direct pushes to `main`.
- Require status checks before merging.
- Require branches to be up to date before merging.
- Disable or tightly restrict bypass permissions.

Required checks:

- `CI / Lint, unit, and docs`
- `CI / Production build`
- `CI / Full regression guardrails`
- `CI / Database migrations`
- `Security / Dependency audit`
- `Security / Secret scan`
- `Security / CodeQL`
- `Security / Security tests and coverage`

Code scanning:

- Enable CodeQL/code scanning.
- Block merges on new high and critical alerts where GitHub exposes code scanning protection rules.
- Require dismissal reasons for dismissed alerts.

## Required Production Environment

Production must include:

- `APP_PUBLIC_URL` or `NEXT_PUBLIC_APP_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` only on the server side

Do not set `RATE_LIMIT_BACKEND=memory` in production. The app rejects that configuration.

## Known Remaining Risks

- Branch protection and code scanning merge blocking cannot be proven from repository files. They require GitHub settings verification.
- The current CSP is partially hardened: production removes `unsafe-eval`, but style inline allowance remains for the current toast implementation. A nonce-based CSP remains a follow-up.
- The tenant-isolation runtime test validates server-side service boundaries with DB test data, but it is not a full Supabase Data API/RLS session test. See `docs/supabase-rls-session-test-plan.md` for the exact follow-up needed.
- One high dev-tooling vulnerability path is temporarily risk-accepted until `2026-07-15`.

## Production Decision

The repository-side P0 controls are now implemented or explicitly documented as GitHub/manual controls. A public production launch still requires manual verification that GitHub branch protection, required checks, code scanning protection and production Upstash env vars are active.
