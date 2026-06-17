# Security Checklist

Use this checklist for every feature, fix, refactor, dependency change and operational change. The goal is to make security impact explicit before merge and to keep the security gate growing with the product.

## Pull Request Requirements

Every PR must answer these questions:

- Authentication impact: does this change alter login, logout, session, password reset, portal access, Supabase Auth, cookies or identity selection?
- Authorization impact: does this change alter roles, company context, super-admin access, buyer access, RLS policies or service-role-only behavior?
- Data exposure risk: can this change expose customer, product, order, import, audit, profile or tenant metadata to the wrong user?
- AI access risk: does this change add AI features, prompts, model calls, retrieval, embeddings, tool calls or AI-visible data?
- Security tests added: what permanent regression tests were added or updated under `tests/security/`?

If the answer is "not applicable", state why. Do not leave a blank answer.

## Required Review By Area

### Authentication

- Validate every credential-bearing input with a schema before calling Supabase Auth.
- Do not trust `user_metadata` / `raw_user_meta_data` for authorization decisions.
- Keep service-role operations server-only.
- Avoid open redirects after login and password reset.

### Authorization

- Treat Server Actions and Route Handlers as public endpoints.
- Check authentication and authorization inside the action/handler, even if the UI hides the control.
- Use `requireCompanyContext` for company-scoped dashboard and portal mutations.
- Use `requireSuperAdmin` for platform admin surfaces.

### Tenant Isolation and IDOR

- Never authorize object access by object id alone.
- Always scope object reads/writes by company context, buyer identity or super-admin authorization.
- Add negative tests for cross-company access when a feature touches tenant data.
- Keep RLS enabled on public tables and add explicit policies for exposed data paths.

### XSS and Output Safety

- Do not introduce `dangerouslySetInnerHTML` without a documented security review and a test.
- Keep user-provided strings rendered through React escaping by default.
- Treat imported spreadsheet content as untrusted input.

### CSRF and Mutations

- Treat Server Actions as direct POST endpoints.
- Mutating Server Actions must authenticate and authorize the user server-side.
- Do not rely on client-side UI restrictions as a security control.

### Uploads and Imports

- Validate file-derived payloads before database writes.
- Keep blocked parser dependencies such as `xlsx` out of the app unless a new review explicitly approves them.
- Add fixture tests for malicious rows, formula-like content, oversized content and duplicate/conflicting records.

### Rate Limiting

- Add rate-limit tests when adding login, password reset, invite/setup link generation, import, checkout or AI endpoints.
- Development and test use the in-memory limiter.
- Production requires an Upstash-compatible Redis backend with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- `RATE_LIMIT_BACKEND=memory` is not allowed in production.
- If the distributed backend is missing or unavailable, production fails closed instead of silently allowing traffic.

### AI Access

- No AI feature may receive customer, order, tenant, auth, audit or import data without an explicit access model.
- Prompts, retrieval filters and tool calls must be tenant-scoped.
- AI output that can affect business state must pass authorization and validation before persistence.

## Environment Variable Exposure

Allowed public variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never expose these through `NEXT_PUBLIC_` variables:

- service role keys
- database URLs
- JWT or auth secrets
- private API keys
- webhook signing secrets
- OpenAI or other model provider keys

Server-only variables:

- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- future webhook signing secrets
- future AI provider API keys

## Vulnerability Regression Rule

Every discovered vulnerability must receive a permanent regression test in tests/security.

The test should fail on the vulnerable behavior and pass only when the mitigation is in place. If the vulnerability needs runtime infrastructure that does not exist yet, create a `[Test Scenario]` issue and add the closest static or service-level regression test immediately.
