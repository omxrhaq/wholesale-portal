import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";

export async function getActivePortalCustomer(
  companyId: string,
  authUserId: string,
) {
  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
    })
    .from(customers)
    .where(
      and(
        eq(customers.companyId, companyId),
        eq(customers.authUserId, authUserId),
        eq(customers.isActive, true),
      ),
    )
    .limit(1);

  return customer ?? null;
}
