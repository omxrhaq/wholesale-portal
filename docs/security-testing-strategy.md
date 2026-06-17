# Security Testing Strategy

The security quality gate is a separate CI layer that runs on every push and pull request. It is intentionally extensible: each new product surface should add security tests to the matching category instead of creating one-off checks.

## CI Security Gate

The security workflow must fail when:

- secrets are detected
- critical npm vulnerabilities are detected
- high npm vulnerabilities are detected unless explicitly risk-accepted in `docs/dependency-security-policy.md`
- CodeQL reports security findings according to GitHub's code scanning rules
- security tests fail
- security coverage falls below the configured threshold

The current workflow is `.github/workflows/security.yml`.

Branch protection must mark the CI and Security jobs as required. See `docs/branch-protection.md`; this cannot be fully enforced from repository files alone.

## Security Test Layout

Security tests live under `tests/security/`:

- `auth/` - login, password reset, session and identity checks
- `authorization/` - role, company context, admin and server action authorization checks
- `idor/` - object-id access and cross-object scoping checks
- `xss/` - unsafe rendering, HTML injection and output escaping checks
- `csrf/` - mutation entrypoint and server-side guard checks
- `uploads/` - import/upload parser and payload validation checks
- `rate-limit/` - brute force and abuse-control checks
- `tenant-isolation/` - company/RLS isolation checks
- `ai/` - AI access, prompt, retrieval and tool-use checks

Each category starts with baseline static tests. As the app grows, add service, DB and browser tests next to the static tests.

## Coverage Threshold

`npm run test:security:coverage` runs the security test suite with Vitest coverage enabled. `npm run test:security:ci` also writes JUnit output to `reports/security-tests.xml` for GitHub artifacts.

The initial coverage threshold applies to the shared security policy module and the rate-limit helper. This makes the gate fail when the security framework is changed without matching tests.

As more runtime security tests are added, expand coverage include patterns and thresholds to cover the security-critical services directly.

## Dependency and Secret Controls

- Dependabot tracks npm and GitHub Actions updates through `.github/dependabot.yml`.
- `npm run security:audit` fails on critical vulnerabilities and on unaccepted high vulnerabilities through `scripts/security-audit.mjs`.
- Gitleaks runs in GitHub Actions with `.gitleaks.toml`.
- CodeQL runs JavaScript/TypeScript analysis with security and quality queries.

Project-specific Gitleaks rules cover Supabase service role keys, JWT/auth secrets, database URLs with credentials, private key blocks, API-style keys and suspicious `NEXT_PUBLIC_` secret names. Documented CI placeholders are allowlisted.

## Security Headers

Security headers are configured in `next.config.ts`:

- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Strict-Transport-Security` in production builds only

The CSP keeps `unsafe-inline` for styles because the current toast component uses inline CSS variables, but production no longer allows `unsafe-eval`. The remaining script hardening work is nonce-based CSP support; track that as a follow-up before expanding client-side script injection points.

## Rate Limiting

Sensitive flows are identified as rate-limit buckets:

- login
- portal login
- password reset
- customer portal setup links
- product import
- checkout
- reorder
- admin access

The helper provides in-memory throttling for development/test only. Production fails closed unless an Upstash-compatible Redis backend is configured with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. `RATE_LIMIT_BACKEND=memory` is rejected in production because in-memory counters are not reliable in serverless or multi-instance deployments.

## Gitleaks Troubleshooting

- The local CI Postgres URL in `.github/workflows/security.yml` is intentionally allowlisted only for the `database-url-with-credentials` rule, and only for that workflow file. This keeps the CI placeholder from failing secret scanning without weakening real database URL detection elsewhere.
- Real database URLs still fail Gitleaks because the allowlist matches only the exact placeholder string in the exact workflow path.
- To run the scanner locally, use the same repository config that CI uses: `gitleaks detect --config .gitleaks.toml --source .`.

## Permanent Regression Rule

Every discovered vulnerability must receive a permanent regression test in tests/security.

Regression tests should be placed in the category that would have caught the vulnerability:

- broken login/session behavior -> `auth/`
- missing role/company check -> `authorization/`
- object id leaks -> `idor/`
- raw HTML/script injection -> `xss/`
- unguarded mutation endpoint -> `csrf/`
- unsafe import/upload parsing -> `uploads/`
- brute force or abuse path -> `rate-limit/`
- cross-tenant access -> `tenant-isolation/`
- prompt/data/tool leak -> `ai/`

## Growth Rules

- New feature PRs must update security tests when they touch auth, authorization, tenant data, imports/uploads, AI, customer/order/product data or public mutation paths.
- If a feature introduces a new security category, add the folder, tests, documentation and PR checklist entry in the same PR.
- If a security test cannot be automated yet, create a `[Test Scenario]` issue and add the closest static regression test.
- Do not remove a security regression test unless the protected feature is removed.
