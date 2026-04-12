import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "@/lib/env";

import * as schema from "./schema";

declare global {
  var __wholesaleSql__: ReturnType<typeof postgres> | undefined;
}

const connection =
  globalThis.__wholesaleSql__ ??
  postgres(getDatabaseUrl(), {
    ssl: "require",
    max: 1,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__wholesaleSql__ = connection;
}

export const db = drizzle(connection, { schema });
export { schema };
