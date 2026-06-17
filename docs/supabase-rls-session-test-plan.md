# Supabase RLS Session Test Plan

The current security gate proves server-side tenant boundaries with isolated Postgres test data. That is not yet the same as exercising Supabase Auth sessions and RLS through the public API surface.

## What is already covered

- server-side service boundaries for customers, orders, products and imports
- negative cross-tenant reads and mutations through application services
- database migrations that keep RLS enabled on new public tables

## What is still needed for full Supabase API / RLS coverage

1. A local Supabase-compatible test environment that can mint real authenticated sessions.
2. Two tenant fixtures with distinct authenticated users and company memberships.
3. A test client that goes through the Supabase SSR/session flow instead of using direct server-side DB access.
4. Negative queries for:
   - tenant A reading tenant B customers
   - tenant A reading tenant B products
   - tenant A reading tenant B orders
   - tenant A reading tenant B import history
   - tenant A mutating tenant B rows through any exposed public data path
5. Positive queries proving each tenant still sees its own rows.
6. A CI job that runs the same test suite against the local Supabase stack or an equivalent disposable test project.

## Minimal implementation plan

- Add a dedicated `tests/security/tenant-isolation/supabase-session.test.ts`.
- Seed two real auth users and two companies.
- Persist and reuse Supabase session cookies in the test client.
- Assert that authenticated requests cannot cross company boundaries even when object ids are guessed.
- Keep the current server-side runtime tenant-isolation test as a fast regression guard.

## Exit criteria

This gap is closed when CI can prove both:

- server-side company scoping remains intact
- Supabase-authenticated requests still fail cross-tenant reads and writes under RLS
