import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const requestedSuites = process.argv.slice(2);
const suites = requestedSuites.length > 0 ? requestedSuites : ["baseline"];

const suiteDefinitions = {
  baseline: {
    description: "Repository baseline: lint, production build, whitespace diff check.",
    commands: [
      ["npm", ["run", "lint"]],
      ["npm", ["run", "build"]],
      ["git", ["diff", "--check"]],
    ],
    checks: [],
    manualChecks: [],
  },
  order: {
    description: "Order and buyer portal guardrails.",
    commands: [
      [
        "npm",
        ["run", "test:unit", "--", "lib/order-intake.test.ts", "lib/orders.test.ts"],
      ],
    ],
    checks: [checkOrderCoverage],
    manualChecks: [
      "Smoke `/portal` and `/dashboard/orders` when UI or route behavior changed.",
      "Exercise checkout, reorder, order detail, and status transition with seeded data when those flows changed.",
    ],
  },
  auth: {
    description: "Auth, identity, and company context guardrails.",
    commands: [],
    checks: [checkAuthCoverage],
    manualChecks: [
      "Smoke login/logout and protected-route redirects when auth or company context changed.",
      "Run negative tenant/role access checks when authorization rules changed.",
    ],
  },
  admin: {
    description: "Super-admin guardrails.",
    commands: [],
    checks: [checkAdminCoverage],
    manualChecks: [
      "Smoke `/admin`, `/admin/access-denied`, and a company detail page when admin UI or services changed.",
      "Verify audit entries when support actions or admin mutations changed.",
    ],
  },
  customers: {
    description: "Customer lifecycle guardrails.",
    commands: [],
    checks: [checkCustomerCoverage],
    manualChecks: [
      "Smoke customer list, create, edit, active toggle, and portal setup when customer flows changed.",
    ],
  },
  products: {
    description: "Product and category guardrails.",
    commands: [],
    checks: [checkProductCoverage],
    manualChecks: [
      "Smoke product/category list, create, edit, and buyer catalog visibility when product flows changed.",
    ],
  },
  imports: {
    description: "Import guardrails.",
    commands: [],
    checks: [checkImportCoverage],
    manualChecks: [
      "Run a fixture import and inspect row failures/history when import parsing or validation changed.",
    ],
  },
  db: {
    description: "Drizzle and Supabase schema/migration guardrails.",
    commands: [["npm", ["run", "docs:check"]]],
    checks: [checkDatabaseCoverage],
    manualChecks: [
      "Run `npm run db:generate` for schema changes and review generated SQL.",
      "Run `npm run db:migrate` against the intended local/staging database before merge.",
      "Run positive and negative RLS/tenant queries when policies or company scoping changed.",
    ],
  },
  ui: {
    description: "App route discovery and UI smoke planning guardrails.",
    commands: [],
    checks: [checkUiCoverage],
    manualChecks: [
      "Open changed routes in a browser and confirm no compile overlay, runtime error, layout break, or unexpected redirect.",
    ],
  },
  docs: {
    description: "Generated documentation guardrails.",
    commands: [["npm", ["run", "docs:check"]]],
    checks: [checkDocsCoverage],
    manualChecks: [
      "Read changed docs/scripts for accuracy when operational instructions changed.",
    ],
  },
};

const fullSuites = [
  "baseline",
  "order",
  "auth",
  "admin",
  "customers",
  "products",
  "imports",
  "db",
  "ui",
  "docs",
];

const expandedSuites = expandSuites(suites);

for (const suiteName of expandedSuites) {
  const suite = suiteDefinitions[suiteName];

  if (!suite) {
    console.error(`Unknown regression suite: ${suiteName}`);
    console.error(`Available suites: ${Object.keys(suiteDefinitions).join(", ")}, full`);
    process.exit(1);
  }

  console.log(`\n== ${suiteName}: ${suite.description}`);

  for (const [command, args] of suite.commands) {
    await run(command, args);
  }

  for (const check of suite.checks) {
    await check();
  }

  if (suite.manualChecks.length > 0) {
    console.log("Manual/runtime checks to consider for this suite:");
    for (const manualCheck of suite.manualChecks) {
      console.log(`- ${manualCheck}`);
    }
  }
}

console.log("\nRegression checks completed.");

function expandSuites(names) {
  const expanded = [];
  for (const name of names) {
    if (name === "full") {
      expanded.push(...fullSuites);
    } else if (name === "all") {
      expanded.push(...fullSuites);
    } else {
      expanded.push(name);
    }
  }

  return Array.from(new Set(expanded));
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

async function checkOrderCoverage() {
  assertFile("lib/order-intake.ts");
  assertFile("lib/order-intake.test.ts");
  assertFile("lib/orders.test.ts");
  assertFile("lib/services/order-intake-service.ts");
  assertFile("lib/services/order-service.ts");
  assertFile("app/portal/actions.ts");
  assertFile("components/portal/buyer-portal-client.tsx");
  assertFileContains("lib/order-intake.test.ts", [
    "merges duplicate product quantities",
    "skips unavailable products for reorder drafts",
    "calculates totals from rounded line totals",
  ]);
  assertFileContains("lib/orders.test.ts", [
    "allows the intended forward status transitions",
    "does not allow terminal orders to transition further",
    "identifies open orders for operational views",
  ]);
  assertFileContains("lib/services/order-intake-service.ts", [
    "createPortalOrder",
    "buildPortalReorderDraft",
    "buildActiveOrderLines",
  ]);
  assertFileContains("lib/services/order-service.ts", [
    "updateOrderStatus",
    "updateOrderDraft",
  ]);
  assertFileContains("lib/orders.ts", [
    "allowedOrderStatusTransitions",
    "canTransitionOrderStatus",
  ]);
}

async function checkAuthCoverage() {
  assertFile("lib/auth/session.ts");
  assertFile("lib/companies/context.ts");
  assertFile("app/login/actions.ts");
  assertFile("app/portal/login/actions.ts");
  assertFileContains("lib/companies/context.ts", [
    "requireCompanyContext",
    "companyUsers",
  ]);
}

async function checkAdminCoverage() {
  assertFile("lib/admin/auth.ts");
  assertFile("lib/services/admin-service.ts");
  assertFile("lib/services/admin-audit-service.ts");
  assertFile("app/admin/page.tsx");
  assertFile("app/admin/access-denied/page.tsx");
  assertFileContains("lib/admin/auth.ts", ["requireSuperAdmin"]);
  assertFileContains("lib/services/admin-audit-service.ts", ["adminAuditLogs"]);
}

async function checkCustomerCoverage() {
  assertFile("lib/services/customer-service.ts");
  assertFile("lib/services/customer-portal-service.ts");
  assertFile("app/dashboard/customers/actions.ts");
  assertFileContains("lib/services/customer-portal-service.ts", [
    "sendCustomerPortalSetupEmail",
    "ensureBuyerAccess",
  ]);
}

async function checkProductCoverage() {
  assertFile("lib/services/product-service.ts");
  assertFile("app/dashboard/products/page.tsx");
  assertFile("app/dashboard/products/categories/page.tsx");
  assertFileContains("lib/services/product-service.ts", [
    "listProducts",
    "isActive",
  ]);
}

async function checkImportCoverage() {
  assertFile("lib/services/import-service.ts");
  assertFile("app/dashboard/products/import/page.tsx");
  assertFileContains("lib/services/import-service.ts", [
    "imports",
    "failedRows",
    "importedRows",
  ]);
}

async function checkDatabaseCoverage() {
  assertFile("lib/db/schema.ts");
  assertFile("drizzle/meta/_journal.json");

  const migrations = await readdir(path.join(root, "drizzle"));
  const sqlMigrations = migrations.filter((file) => file.endsWith(".sql"));
  if (sqlMigrations.length === 0) {
    throw new Error("No Drizzle SQL migrations found.");
  }

  assertFileContains("lib/db/schema.ts", [
    "enableRLS",
    "pgPolicy",
    "companyUsers",
  ]);
}

async function checkUiCoverage() {
  assertFile("app/page.tsx");
  assertFile("app/dashboard/page.tsx");
  assertFile("app/portal/page.tsx");
  assertFile("app/admin/page.tsx");

  const routeCount = await countRoutes(path.join(root, "app"));
  if (routeCount < 5) {
    throw new Error(`Unexpectedly low route count: ${routeCount}`);
  }

  console.log(`Discovered ${routeCount} app routes. Run browser smoke checks for changed routes.`);
}

async function checkDocsCoverage() {
  assertFile("README.md");
  assertFile("docs/testing-strategy.md");
  assertFile("scripts/update-readme.mjs");
}

function assertFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`Expected file is missing: ${relativePath}`);
  }
}

function assertFileContains(relativePath, expectedSnippets) {
  const filePath = path.join(root, relativePath);
  const content = readTextFile(filePath);

  for (const snippet of expectedSnippets) {
    if (!content.includes(snippet)) {
      throw new Error(`Expected ${relativePath} to contain: ${snippet}`);
    }
  }
}

function readTextFile(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
}

async function countRoutes(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      count += await countRoutes(fullPath);
      continue;
    }

    if (entry.name === "page.tsx" || entry.name === "route.ts") {
      count += 1;
    }
  }

  return count;
}
