import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getAuthUser, requireAuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { companies, companyUsers, type AppRole } from "@/lib/db/schema";

export type CompanyContext = {
  userId: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
  companyUser: {
    id: string;
    role: AppRole;
  };
};

export async function getCurrentCompanyContext() {
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  const membership = await db
    .select({
      companyId: companies.id,
      companyName: companies.name,
      companySlug: companies.slug,
      companyUserId: companyUsers.id,
      role: companyUsers.role,
    })
    .from(companyUsers)
    .innerJoin(companies, eq(companyUsers.companyId, companies.id))
    .where(eq(companyUsers.userId, user.id))
    .limit(1);

  const currentMembership = membership[0];

  if (!currentMembership) {
    return null;
  }

  return {
    userId: user.id,
    company: {
      id: currentMembership.companyId,
      name: currentMembership.companyName,
      slug: currentMembership.companySlug,
    },
    companyUser: {
      id: currentMembership.companyUserId,
      role: currentMembership.role,
    },
  } satisfies CompanyContext;
}

export async function requireCompanyContext(allowedRoles?: AppRole[]) {
  const user = await requireAuthUser();

  const membership = await db
    .select({
      companyId: companies.id,
      companyName: companies.name,
      companySlug: companies.slug,
      companyUserId: companyUsers.id,
      role: companyUsers.role,
    })
    .from(companyUsers)
    .innerJoin(companies, eq(companyUsers.companyId, companies.id))
    .where(eq(companyUsers.userId, user.id))
    .limit(1);

  const currentMembership = membership[0];

  if (!currentMembership) {
    redirect("/login?error=no-company");
  }

  if (allowedRoles && !allowedRoles.includes(currentMembership.role)) {
    redirect(currentMembership.role === "buyer" ? "/portal" : "/dashboard");
  }

  return {
    userId: user.id,
    company: {
      id: currentMembership.companyId,
      name: currentMembership.companyName,
      slug: currentMembership.companySlug,
    },
    companyUser: {
      id: currentMembership.companyUserId,
      role: currentMembership.role,
    },
  } satisfies CompanyContext;
}
