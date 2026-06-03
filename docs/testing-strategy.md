# Testing Strategy

This project treats every code change as a regression risk in the product area it touches. The goal is not to run the same small check every time, but to run the smallest set of checks that can reasonably prove the related functionality still works.

## Definition of Done

Every change must finish with:

- A touched-area assessment: which product areas can be affected.
- Baseline regression checks:
  - `npm run lint`
  - `npm run build`
  - `git diff --check`
- Domain regression checks for every affected area in the matrix below.
- A final note listing:
  - checks run
  - checks that could not run
  - residual risk

If a change affects more than one area, run the union of the relevant checks.

## Regression Matrix

| Changed area | Product functionality to protect | Required checks now | Target checks to add |
| --- | --- | --- | --- |
| Order intake / buyer portal | Catalog visibility, cart, checkout, reorder draft, unavailable products, duplicate quantities, order history | `npm run test:regression:order`; browser smoke check for `/portal` when a dev server/browser is available | More service tests for DB-backed `order-intake-service`; Playwright buyer checkout and reorder flow |
| Dashboard orders | Orders list, filters, sorting, detail page, draft edits, status transitions, activity timeline | `npm run test:regression:order`; browser smoke check for `/dashboard/orders` and one order detail when data is available | More service tests for draft edits; Playwright status transition flow |
| Auth / identity / company context | Login, logout, password reset, selected company, buyer access, tenant isolation | `npm run test:regression:auth`; browser smoke check for login and protected redirects | Auth integration tests with seeded users; negative tenant access checks |
| Super-admin | `/admin`, access denied, company overview, company detail, audit history | `npm run test:regression:admin`; browser smoke check for `/admin` and `/admin/access-denied` | Super-admin access tests and audit log assertions |
| Customers | Create/edit/deactivate/reactivate customers, buyer portal setup, portal account linking | `npm run test:regression:customers`; browser smoke check for customer routes when data is available | Server action tests for customer lifecycle and portal setup |
| Products / categories | Product CRUD, category CRUD, product visibility in buyer portal | `npm run test:regression:products`; browser smoke check for product/category routes | Service tests for category normalization and product visibility |
| Imports | Template download, validation, duplicate handling, import history | `npm run test:regression:imports`; manual import fixture check until automated coverage exists | Fixture-based import tests with row-level errors |
| Database / Drizzle / Supabase RLS | Migrations, schema snapshots, RLS policies, tenant isolation, service-role-only paths | `npm run test:regression:db`; review generated SQL and RLS policies | Isolated migration test database; RLS positive/negative query suite |
| UI-only changes | Layout, responsive rendering, loading/empty/error states, copy | `npm run test:regression:ui`; browser smoke check for changed routes | Playwright visual smoke screenshots for core routes |
| Documentation / scripts | README generation, hooks, operational commands | `npm run test:regression:docs` | Script-specific tests for docs/hooks |

## Current Script Levels

Use these scripts as the standard entry points:

- `npm run test:regression` runs the baseline checks.
- `npm run test:regression:order` runs baseline checks, order-intake/status workflow unit tests, and order-specific static coverage checks.
- `npm run test:regression:auth` runs baseline checks plus auth/company-context static coverage checks.
- `npm run test:regression:admin` runs baseline checks plus admin static coverage checks.
- `npm run test:regression:db` runs baseline checks plus Drizzle/Supabase schema and migration presence checks.
- `npm run test:regression:ui` runs baseline checks plus route discovery.
- `npm run test:regression:full` runs all currently automated regression checks.

These scripts are not a replacement for browser or database execution checks. They define the minimum automated floor until proper service and end-to-end tests are added. Domain scripts are guardrails: they prove the expected modules, routes, schema files, and generated docs are still present, then print the runtime checks that still need judgment for that kind of change.

## Browser Smoke Checks

For UI or flow changes, run a local dev server and smoke the affected routes:

1. Start `npm run dev`.
2. Open the affected route.
3. Confirm there is no compile overlay, runtime error, or unexpected redirect.
4. Exercise the changed interaction if realistic local data exists.

Recommended route groups:

- Buyer portal: `/portal`, `/portal/login`.
- Dashboard orders: `/dashboard/orders`, `/dashboard/orders/[id]` with seeded data.
- Admin: `/admin`, `/admin/access-denied`, `/admin/companies/[companyId]` with seeded data.
- Products/imports: `/dashboard/products`, `/dashboard/products/import`.
- Customers: `/dashboard/customers`, `/dashboard/customers/new`.

If the browser or dev server is unavailable, record that in the final note and rely on `npm run build` as the minimum render/type check.

## Reporting Format

After every change, report checks in this shape:

- Affected areas: for example `order intake`, `buyer portal`, `docs`.
- Automated checks: exact commands that passed or failed.
- Runtime checks: browser, curl, DB, or script-level checks that exercised the related flow.
- Not run: anything relevant that could not run, with the reason.
- Residual risk: short statement of what remains unproven.

## Database Checks

For schema, migration, RLS, or Supabase Auth changes:

- Review the Drizzle schema diff in `lib/db/schema.ts`.
- Review generated SQL in `drizzle/*.sql`.
- Run `npm run db:generate` when the schema changes.
- Run `npm run db:migrate` against the intended local/staging database before merge.
- Run targeted positive and negative tenant queries when RLS or company scoping changes.

Never run reset or seed commands against a shared or production database.

## Test Coverage Roadmap

Add coverage in this order:

1. Expand service-level tests from pure order intake/status workflow into DB-backed order intake and draft edits.
2. Server-action tests for customer and order mutations.
3. Import fixture tests for validation and duplicate handling.
4. RLS integration tests against an isolated Supabase/Postgres database.
5. Playwright end-to-end smoke flows for buyer checkout, reorder, admin access, and import.

The first target is order intake because it protects direct business value and supports the next automation-engine work.
