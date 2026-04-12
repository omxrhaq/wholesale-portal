import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { imports } from "@/lib/db/schema";

export async function listImports(companyId: string) {
  return db
    .select()
    .from(imports)
    .where(eq(imports.companyId, companyId))
    .orderBy(desc(imports.createdAt));
}
