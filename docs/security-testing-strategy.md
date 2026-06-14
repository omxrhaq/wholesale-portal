# Security Testing Strategy

The security quality gate is a separate CI layer that runs on every push and pull request. It is intentionally extensible: each new product surface should add security tests to the matching category instead of creating one-off checks.

## CI Security Gate

The security workflow must fail when:

- secrets are detected
- critical npm vulnerabilities are detected
- CodeQL reports security findings according to GitHub's code scanning rules
- security tests fail
- security coverage falls below the configured threshold

The current workflow is `.github/workflows/security.yml`.

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

`npm run test:security:coverage` runs the security test suite with Vitest coverage enabled. The initial coverage threshold applies to the shared security policy module that defines required categories, PR questions and regression rules. This makes the gate fail when the security framework is changed without matching tests.

As more runtime security tests are added, expand coverage include patterns and thresholds to cover the security-critical services directly.

## Dependency and Secret Controls

- Dependabot tracks npm and GitHub Actions updates through `.github/dependabot.yml`.
- `npm run security:audit` fails on critical vulnerabilities through `npm audit --audit-level=critical`.
- Gitleaks runs in GitHub Actions with `.gitleaks.toml`.
- CodeQL runs JavaScript/TypeScript analysis with security and quality queries.

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
