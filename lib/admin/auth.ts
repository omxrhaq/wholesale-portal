import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { profiles, superAdmins } from "@/lib/db/schema";

export type SuperAdminContext = {
  userId: string;
  profile: {
    email: string | null;
    fullName: string | null;
  };
  superAdmin: {
    grantedBy: string | null;
    createdAt: Date;
  };
};

async function fetchSuperAdminContext(userId: string) {
  const [row] = await db
    .select({
      userId: superAdmins.userId,
      grantedBy: superAdmins.grantedBy,
      createdAt: superAdmins.createdAt,
      email: profiles.email,
      fullName: profiles.fullName,
    })
    .from(superAdmins)
    .leftJoin(profiles, eq(superAdmins.userId, profiles.id))
    .where(eq(superAdmins.userId, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    userId: row.userId,
    profile: {
      email: row.email,
      fullName: row.fullName,
    },
    superAdmin: {
      grantedBy: row.grantedBy,
      createdAt: row.createdAt,
    },
  } satisfies SuperAdminContext;
}

export async function getSuperAdminContext() {
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  return fetchSuperAdminContext(user.id);
}

export async function requireSuperAdmin() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const context = await fetchSuperAdminContext(user.id);

  if (!context) {
    redirect("/admin/access-denied");
  }

  return context;
}
