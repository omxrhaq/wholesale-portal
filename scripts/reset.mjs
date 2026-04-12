import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  prepare: false,
});

async function main() {
  await sql.unsafe(`
    truncate table
      public.activity_logs,
      public.imports,
      public.order_items,
      public.orders,
      public.products,
      public.customers,
      public.company_users,
      public.profiles,
      public.companies
    restart identity cascade
  `);

  console.log(
    JSON.stringify(
      {
        reset: true,
        tables: [
          "activity_logs",
          "imports",
          "order_items",
          "orders",
          "products",
          "customers",
          "company_users",
          "profiles",
          "companies",
        ],
        authUsersTouched: false,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} finally {
  await sql.end();
}
