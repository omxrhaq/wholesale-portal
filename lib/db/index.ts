import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "@/lib/env";

import * as schema from "./schema";

declare global {
  var __wholesaleSql__: ReturnType<typeof postgres> | undefined;
}

function getDatabasePoolMax() {
  const rawValue = process.env.DATABASE_POOL_MAX;
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return process.env.NODE_ENV === "production" ? 10 : 5;
}

const connection =
  globalThis.__wholesaleSql__ ??
  postgres(getDatabaseUrl(), {
    ssl: "require",
    max: getDatabasePoolMax(),
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__wholesaleSql__ = connection;
}

export const db = drizzle(connection, { schema });
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbExecutor = typeof db | DbTransaction;
export { schema };
