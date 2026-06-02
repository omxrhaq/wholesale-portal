import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { companies, companyUsers } from "@/lib/db/schema";
import { listAdminAuditForCompany } from "@/lib/services/admin-audit-service";

export async function getAdminOverviewStats() {
  const [summary] = await db
    .select({
      companyCount: sql<number>`count(distinct ${companies.id})`.as("company_count"),
      staffCount: sql<number>`(
        select count(*)
        from ${companyUsers}
        where ${companyUsers.role} in ('wholesaler_owner', 'wholesaler_staff')
      )`.as("staff_count"),
    })
    .from(companies);

  return {
    companyCount: Number(summary?.companyCount ?? 0),
    staffCount: Number(summary?.staffCount ?? 0),
  };
}

export async function listAdminCompanies() {
  return db
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      createdAt: companies.createdAt,
      staffCount: sql<number>`(
        select count(*)
        from ${companyUsers}
        where ${companyUsers.companyId} = ${companies.id}
          and ${companyUsers.role} in ('wholesaler_owner', 'wholesaler_staff')
      )`.as("staff_count"),
    })
    .from(companies)
    .orderBy(asc(companies.name));
}

export async function getAdminCompanyDetail(companyId: string) {
  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      createdAt: companies.createdAt,
      staffCount: sql<number>`(
        select count(*)
        from ${companyUsers}
        where ${companyUsers.companyId} = ${companies.id}
          and ${companyUsers.role} in ('wholesaler_owner', 'wholesaler_staff')
      )`.as("staff_count"),
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  return company ?? null;
}

export async function getAdminCompanyWorkspace(companyId: string) {
  const company = await getAdminCompanyDetail(companyId);

  if (!company) {
    return null;
  }

  return {
    company,
    recentAdminActivity: await listAdminAuditForCompany(companyId, 12),
  };
}
