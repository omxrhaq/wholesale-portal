# Wholesale Portal

B2B wholesale ordering portal for small and midsize wholesalers. The MVP focuses on a simple monolithic web app where wholesalers manage products, customers and orders, while buyers place orders through a dedicated portal.

## Current MVP

- Wholesaler dashboard with protected login and company-scoped data.
- Product management with create, edit, deactivate, category assignment, category management and list views.
- Excel product import with downloadable template, category mapping, validation, duplicate handling and import history.
- Customer management with create, edit, deactivate and buyer portal access setup.
- Orders overview with search, sortable columns, status views and order detail pages.
- Buyer portal with authentication, category filters, catalog search, quantity inputs, cart, checkout, order notes, order history and reorder flow.
- Language switcher for English, Dutch and French UI copy.
- Database-level RLS policies plus automatic RLS enabling for new public tables.

## Current Status

- Product categories are fully integrated across product forms, imports, dashboard lists and the buyer portal.
- Dashboard and portal UX have been widened and polished with empty states, loading screens, skeletons and reusable status banners.
- The order system now enforces strict status transitions, logs audit events and shows an order timeline in the dashboard.
- Buyer reorder flow is available from portal order history for faster repeat ordering.
- Authentication and authorization run through Supabase auth plus company-scoped memberships in `company_users`.

## What Still Needs Work

- Identity hardening:
  - replace remaining email-driven buyer linking flows with an explicit `portalUserId` model
  - make company selection explicit for users who can belong to more than one company
  - audit all server actions for strict company-scoped entity checks
- Automation engine:
  - add DB-backed rules with simple conditions and actions
  - support first actions such as auto-confirm, assign owner and stale-order reminders
- Order workflow follow-up:
  - add explicit success feedback after status changes
  - add assignment / ownership support for wholesaler staff
- Import improvements:
  - row-level error reporting
  - stronger duplicate handling and safer retry flows
- Quality and operations:
  - add unit and integration tests for services and critical server actions
  - add analytics and notification flows once the security and automation foundations are finished

## Stack

- Next.js: `next@16.2.3`
- React: `react@19.2.4`
- TypeScript: `typescript@^5`
- Tailwind CSS: `tailwindcss@^4`
- Supabase SSR: `@supabase/ssr@^0.10.2`
- Supabase JS: `@supabase/supabase-js@^2.103.0`
- Drizzle ORM: `drizzle-orm@^0.45.2`
- Drizzle Kit: `drizzle-kit@^0.31.10`
- Zod: `zod@^4.3.6`
- React Hook Form: `react-hook-form@^7.72.1`
- ExcelJS: `exceljs@^4.4.0`
- read-excel-file: `read-excel-file@^8.0.3`
- Sonner: `sonner@^2.0.7`

## App Routes

- `/`
- `/account/password`
- `/dashboard`
- `/dashboard/customers`
- `/dashboard/customers/[id]/edit`
- `/dashboard/customers/new`
- `/dashboard/orders`
- `/dashboard/orders/[id]`
- `/dashboard/products`
- `/dashboard/products/[id]/edit`
- `/dashboard/products/categories`
- `/dashboard/products/categories/[id]/edit`
- `/dashboard/products/categories/new`
- `/dashboard/products/import`
- `/dashboard/products/new`
- `/forgot-password`
- `/login`
- `/portal`
- `/portal/login`
- `/reset-password`

## Route Handlers

- `/auth/callback`
- `/dashboard/products/import/template`
- `/portal/logout`

## Database

- Drizzle schema: `lib/db/schema.ts`
- Drizzle config: `drizzle.config.ts`
- Generated SQL migrations: `drizzle/*.sql`
- Company scoping is handled with `company_id` across business tables.
- RLS is enabled on public app tables with policies based on `company_users` roles and `customers.auth_user_id`.
- New public tables automatically get RLS enabled through the `ensure_rls_on_public_tables` event trigger.
- Order items store product name and price snapshots at order time.
- Activity logs are used as the audit trail for customer, product and order events.

### Migrations

- `0000_crazy_gunslinger.sql`
- `0001_fast_bloodstrike.sql`
- `0002_minor_rogue.sql`
- `0003_broad_white_tiger.sql`
- `0004_dizzy_meggan.sql`
- `0005_absent_red_ghost.sql`
- `0006_auto_enable_rls_new_tables.sql`
- `0007_product_categories.sql`

## Environment

Create a local `.env.local` file with these variables:

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only and is used for admin-only Supabase Auth actions, such as creating or disabling buyer login accounts. Never expose it in client components or commit it to Git.

## Commands

- `npm run build` - `next build`
- `npm run db:fresh` - `npm run db:reset && npm run db:seed`
- `npm run db:generate` - `drizzle-kit generate`
- `npm run db:migrate` - `drizzle-kit migrate`
- `npm run db:reset` - `node scripts/reset.mjs`
- `npm run db:seed` - `node scripts/seed.mjs`
- `npm run db:studio` - `drizzle-kit studio`
- `npm run dev` - `next dev`
- `npm run docs:check` - `node scripts/update-readme.mjs --check`
- `npm run docs:update` - `node scripts/update-readme.mjs`
- `npm run hooks:install` - `node scripts/install-git-hooks.mjs`
- `npm run lint` - `eslint`
- `npm run prepare` - `node scripts/install-git-hooks.mjs`
- `npm run start` - `next start`

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in the browser.

## Database Workflow

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Use `npm run db:fresh` when you want to reset local data and load the seed again.

## Import Security

Do not use the `xlsx` / SheetJS CE npm package in this app. The import flow intentionally avoids that package and uses safer Excel tooling instead. CSV support can be reintroduced later if needed, but the current MVP import flow is Excel-first.

## README Automation

This README is generated by `npm run docs:update`.

- `npm run docs:update` rewrites the README from the current project structure.
- `npm run docs:check` verifies that the README is up to date.
- `npm run hooks:install` installs local Git hooks.
- The local `pre-commit` hook updates and stages `README.md`.
- The local `pre-push` hook blocks the push if `README.md` is outdated.
