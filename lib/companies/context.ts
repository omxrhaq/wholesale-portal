import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthUser, requireAuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { companies, companyUsers, type AppRole } from "@/lib/db/schema";

const ACTIVE_COMPANY_COOKIE_NAME = "active-company-id";

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

type CompanyMembership = {
  companyId: string;
  companyName: string;
  companySlug: string;
  companyUserId: string;
  role: AppRole;
};

export type CompanyMembershipSummary = CompanyMembership;

async function listCompanyMembershipsForUser(userId: string) {
  return db
    .select({
      companyId: companies.id,
      companyName: companies.name,
      companySlug: companies.slug,
      companyUserId: companyUsers.id,
      role: companyUsers.role,
    })
    .from(companyUsers)
    .innerJoin(companies, eq(companyUsers.companyId, companies.id))
    .where(eq(companyUsers.userId, userId))
    .orderBy(asc(companies.name), asc(companyUsers.createdAt));
}

function filterMembershipsByRole(
  memberships: CompanyMembership[],
  allowedRoles?: AppRole[],
) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return memberships;
  }

  return memberships.filter((membership) => allowedRoles.includes(membership.role));
}

async function getActiveCompanyId() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_COMPANY_COOKIE_NAME)?.value ?? null;
}

function selectCompanyMembership(
  memberships: CompanyMembership[],
  activeCompanyId: string | null,
) {
  if (activeCompanyId) {
    const activeMembership = memberships.find(
      (membership) => membership.companyId === activeCompanyId,
    );

    if (activeMembership) {
      return activeMembership;
    }
  }

  return memberships[0] ?? null;
}

function toCompanyContext(userId: string, membership: CompanyMembership): CompanyContext {
  return {
    userId,
    company: {
      id: membership.companyId,
      name: membership.companyName,
      slug: membership.companySlug,
    },
    companyUser: {
      id: membership.companyUserId,
      role: membership.role,
    },
  };
}

export async function setActiveCompanyId(companyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE_NAME, companyId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearActiveCompanyId() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_COMPANY_COOKIE_NAME);
}

export async function getCurrentCompanyContext() {
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  const memberships = await listCompanyMembershipsForUser(user.id);
  const currentMembership = selectCompanyMembership(
    memberships,
    await getActiveCompanyId(),
  );

  if (!currentMembership) {
    return null;
  }

  return toCompanyContext(user.id, currentMembership);
}

export async function listCurrentUserCompanyMemberships(allowedRoles?: AppRole[]) {
  const user = await getAuthUser();

  if (!user) {
    return [];
  }

  const memberships = await listCompanyMembershipsForUser(user.id);
  return filterMembershipsByRole(memberships, allowedRoles);
}

export async function setActiveCompanyForCurrentUser(
  companyId: string,
  allowedRoles?: AppRole[],
) {
  const user = await requireAuthUser();
  const memberships = filterMembershipsByRole(
    await listCompanyMembershipsForUser(user.id),
    allowedRoles,
  );
  const membership = memberships.find((candidate) => candidate.companyId === companyId);

  if (!membership) {
    throw new Error("You do not have access to that company.");
  }

  await setActiveCompanyId(companyId);
  return toCompanyContext(user.id, membership);
}

export async function requireCompanyContext(allowedRoles?: AppRole[]) {
  const user = await requireAuthUser();
  const memberships = filterMembershipsByRole(
    await listCompanyMembershipsForUser(user.id),
    allowedRoles,
  );
  const currentMembership = selectCompanyMembership(
    memberships,
    await getActiveCompanyId(),
  );

  if (!currentMembership) {
    redirect("/login?error=no-company");
  }

  return toCompanyContext(user.id, currentMembership);
}
