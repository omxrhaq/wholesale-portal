import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { adminAuditLogs, profiles } from "@/lib/db/schema";

export type AdminAuditEntry = {
  id: string;
  actionType: string;
  targetType: string;
  companyId: string | null;
  createdAt: Date;
  actor: {
    userId: string;
    name: string | null;
    email: string | null;
  };
};

const auditSelect = {
  id: adminAuditLogs.id,
  actionType: adminAuditLogs.actionType,
  targetType: adminAuditLogs.targetType,
  companyId: adminAuditLogs.companyId,
  createdAt: adminAuditLogs.createdAt,
  userId: adminAuditLogs.adminUserId,
  actorName: profiles.fullName,
  actorEmail: profiles.email,
};

export async function listRecentAdminAudit(limit = 12) {
  const rows = await db
    .select(auditSelect)
    .from(adminAuditLogs)
    .leftJoin(profiles, eq(adminAuditLogs.adminUserId, profiles.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit);

  return rows.map(mapAdminAuditRow);
}

export async function listAdminAuditForCompany(companyId: string, limit = 12) {
  const rows = await db
    .select(auditSelect)
    .from(adminAuditLogs)
    .leftJoin(profiles, eq(adminAuditLogs.adminUserId, profiles.id))
    .where(eq(adminAuditLogs.companyId, companyId))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit);

  return rows.map(mapAdminAuditRow);
}

function mapAdminAuditRow(row: {
  id: string;
  actionType: string;
  targetType: string;
  companyId: string | null;
  createdAt: Date;
  userId: string;
  actorName: string | null;
  actorEmail: string | null;
}): AdminAuditEntry {
  return {
    id: row.id,
    actionType: row.actionType,
    targetType: row.targetType,
    companyId: row.companyId,
    createdAt: row.createdAt,
    actor: {
      userId: row.userId,
      name: row.actorName,
      email: row.actorEmail,
    },
  };
}
