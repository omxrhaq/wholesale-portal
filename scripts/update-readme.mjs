import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const readmePath = path.join(root, "README.md");
const packagePath = path.join(root, "package.json");

const checkOnly = process.argv.includes("--check");

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  if (!(await exists(dir))) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return walk(fullPath);
      }

      return fullPath;
    }),
  );

  return files.flat();
}

function pageFileToRoute(filePath) {
  const relative = path.relative(path.join(root, "app"), filePath);
  const withoutPage = relative.replace(/\/page\.tsx$/, "");

  if (withoutPage === "page.tsx" || withoutPage === "") {
    return "/";
  }

  return `/${withoutPage}`.replace(/\/page\.tsx$/, "");
}

function routeFileToRoute(filePath) {
  const relative = path.relative(path.join(root, "app"), filePath);
  return `/${relative.replace(/\/route\.ts$/, "")}`;
}

async function getAppRoutes() {
  const files = await walk(path.join(root, "app"));
  return files
    .filter((file) => file.endsWith("/page.tsx"))
    .map(pageFileToRoute)
    .sort((a, b) => a.localeCompare(b));
}

async function getRouteHandlers() {
  const files = await walk(path.join(root, "app"));
  return files
    .filter((file) => file.endsWith("/route.ts"))
    .map(routeFileToRoute)
    .sort((a, b) => a.localeCompare(b));
}

async function getMigrations() {
  const drizzleDir = path.join(root, "drizzle");

  if (!(await exists(drizzleDir))) {
    return [];
  }

  const entries = await readdir(drizzleDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function formatList(items) {
  if (items.length === 0) {
    return "- None yet";
  }

  return items.map((item) => `- \`${item}\``).join("\n");
}

function formatScripts(scripts) {
  return Object.entries(scripts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, command]) => `- \`npm run ${name}\` - \`${command}\``)
    .join("\n");
}

function getInstalledStack(dependencies, devDependencies) {
  const allDependencies = { ...dependencies, ...devDependencies };
  const stack = [
    ["Next.js", "next"],
    ["React", "react"],
    ["TypeScript", "typescript"],
    ["Tailwind CSS", "tailwindcss"],
    ["Supabase SSR", "@supabase/ssr"],
    ["Supabase JS", "@supabase/supabase-js"],
    ["Drizzle ORM", "drizzle-orm"],
    ["Drizzle Kit", "drizzle-kit"],
    ["Zod", "zod"],
    ["React Hook Form", "react-hook-form"],
    ["ExcelJS", "exceljs"],
    ["read-excel-file", "read-excel-file"],
    ["Sonner", "sonner"],
  ];

  return stack
    .filter(([, packageName]) => allDependencies[packageName])
    .map(
      ([label, packageName]) =>
        `- ${label}: \`${packageName}@${allDependencies[packageName]}\``,
    )
    .join("\n");
}

const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const routes = await getAppRoutes();
const routeHandlers = await getRouteHandlers();
const migrations = await getMigrations();

const readme = `# Wholesale Portal

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

## Stack

${getInstalledStack(packageJson.dependencies, packageJson.devDependencies)}

## App Routes

${formatList(routes)}

## Route Handlers

${formatList(routeHandlers)}

## Database

- Drizzle schema: \`lib/db/schema.ts\`
- Drizzle config: \`drizzle.config.ts\`
- Generated SQL migrations: \`drizzle/*.sql\`
- Company scoping is handled with \`company_id\` across business tables.
- RLS is enabled on public app tables with policies based on \`company_users\` roles and \`customers.auth_user_id\`.
- New public tables automatically get RLS enabled through the \`ensure_rls_on_public_tables\` event trigger.
- Order items store product name and price snapshots at order time.

### Migrations

${formatList(migrations)}

## Environment

Create a local \`.env.local\` file with these variables:

\`\`\`bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
\`\`\`

\`SUPABASE_SERVICE_ROLE_KEY\` is server-only and is used for admin-only Supabase Auth actions, such as creating or disabling buyer login accounts. Never expose it in client components or commit it to Git.

## Commands

${formatScripts(packageJson.scripts)}

## Local Development

\`\`\`bash
npm install
npm run dev
\`\`\`

Open \`http://localhost:3000\` in the browser.

## Database Workflow

\`\`\`bash
npm run db:generate
npm run db:migrate
npm run db:seed
\`\`\`

Use \`npm run db:fresh\` when you want to reset local data and load the seed again.

## Import Security

Do not use the \`xlsx\` / SheetJS CE npm package in this app. The import flow intentionally avoids that package and uses safer Excel tooling instead. CSV support can be reintroduced later if needed, but the current MVP import flow is Excel-first.

## README Automation

This README is generated by \`npm run docs:update\`.

- \`npm run docs:update\` rewrites the README from the current project structure.
- \`npm run docs:check\` verifies that the README is up to date.
- \`npm run hooks:install\` installs local Git hooks.
- The local \`pre-commit\` hook updates and stages \`README.md\`.
- The local \`pre-push\` hook blocks the push if \`README.md\` is outdated.
`;

const currentReadme = (await exists(readmePath))
  ? await readFile(readmePath, "utf8")
  : "";

if (currentReadme === readme) {
  console.log("README.md is up to date.");
  process.exit(0);
}

if (checkOnly) {
  console.error("README.md is outdated. Run `npm run docs:update` and commit the result.");
  process.exit(1);
}

await writeFile(readmePath, readme);
console.log("README.md updated.");
