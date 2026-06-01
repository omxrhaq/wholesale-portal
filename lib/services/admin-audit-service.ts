import { desc, eq } from "drizzle-orm";

import { db, type DbExecutor } from "@/lib/db";
import { adminAuditLogs, profiles } from "@/lib/db/schema";

type AdminAuditMetadataMap = {
  "admin.customer.reactivated": {
    customerName: string;
    customerEmail: string | null;
  };
  "admin.customer.deactivated": {
    customerName: string;
    customerEmail: string | null;
  };
  "admin.customer.portal_setup_email_sent": {
    customerName: string;
    customerEmail: string;
  };
  "admin.customer.updated": {
    customerName: string;
    customerEmail: string | null;
  };
  "admin.product.reactivated": {
    productName: string;
    sku: string;
  };
  "admin.product.deactivated": {
    productName: string;
    sku: string;
  };
  "admin.product.updated": {
    productName: string;
    sku: string;
  };
  "admin.order.status_changed": {
    customerName: string;
    previousStatus: string;
    nextStatus: string;
  };
};

export type AdminAuditActionType = keyof AdminAuditMetadataMap;

type AdminAuditTargetByAction = {
  "admin.customer.reactivated": "customer";
  "admin.customer.deactivated": "customer";
  "admin.customer.portal_setup_email_sent": "customer";
  "admin.customer.updated": "customer";
  "admin.product.reactivated": "product";
  "admin.product.deactivated": "product";
  "admin.product.updated": "product";
  "admin.order.status_changed": "order";
};

type LogAdminAuditInput<TActionType extends AdminAuditActionType = AdminAuditActionType> = {
  adminUserId: string;
  actionType: TActionType;
  targetId: string;
  companyId?: string | null;
  metadata: AdminAuditMetadataMap[TActionType];
};

const targetTypeByAction: AdminAuditTargetByAction = {
  "admin.customer.reactivated": "customer",
  "admin.customer.deactivated": "customer",
  "admin.customer.portal_setup_email_sent": "customer",
  "admin.customer.updated": "customer",
  "admin.product.reactivated": "product",
  "admin.product.deactivated": "product",
  "admin.product.updated": "product",
  "admin.order.status_changed": "order",
};

async function insertAdminAudit<TActionType extends AdminAuditActionType>(
  executor: DbExecutor,
  input: LogAdminAuditInput<TActionType>,
) {
  await executor.insert(adminAuditLogs).values({
    adminUserId: input.adminUserId,
    actionType: input.actionType,
    targetType: targetTypeByAction[input.actionType],
    targetId: input.targetId,
    companyId: input.companyId ?? null,
    metadata: input.metadata,
  });
}

export async function logAdminAudit<TActionType extends AdminAuditActionType>(
  input: LogAdminAuditInput<TActionType>,
) {
  await insertAdminAudit(db, input);
}

export async function logAdminAuditTx<TActionType extends AdminAuditActionType>(
  executor: DbExecutor,
  input: LogAdminAuditInput<TActionType>,
) {
  await insertAdminAudit(executor, input);
}

export type AdminAuditEntry = {
  id: string;
  actionType: AdminAuditActionType;
  targetType: string;
  targetId: string | null;
  companyId: string | null;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
  actor: {
    userId: string;
    name: string | null;
    email: string | null;
  };
};

export async function listRecentAdminAudit(limit = 12) {
  const rows = await db
    .select({
      id: adminAuditLogs.id,
      actionType: adminAuditLogs.actionType,
      targetType: adminAuditLogs.targetType,
      targetId: adminAuditLogs.targetId,
      companyId: adminAuditLogs.companyId,
      metadata: adminAuditLogs.metadata,
      createdAt: adminAuditLogs.createdAt,
      userId: adminAuditLogs.adminUserId,
      actorName: profiles.fullName,
      actorEmail: profiles.email,
    })
    .from(adminAuditLogs)
    .leftJoin(profiles, eq(adminAuditLogs.adminUserId, profiles.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit);

  return rows.map(mapAdminAuditRow);
}

export async function listAdminAuditForCompany(companyId: string, limit = 12) {
  const rows = await db
    .select({
      id: adminAuditLogs.id,
      actionType: adminAuditLogs.actionType,
      targetType: adminAuditLogs.targetType,
      targetId: adminAuditLogs.targetId,
      companyId: adminAuditLogs.companyId,
      metadata: adminAuditLogs.metadata,
      createdAt: adminAuditLogs.createdAt,
      userId: adminAuditLogs.adminUserId,
      actorName: profiles.fullName,
      actorEmail: profiles.email,
    })
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
  targetId: string | null;
  companyId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  userId: string;
  actorName: string | null;
  actorEmail: string | null;
}): AdminAuditEntry {
  return {
    id: row.id,
    actionType: row.actionType as AdminAuditActionType,
    targetType: row.targetType,
    targetId: row.targetId,
    companyId: row.companyId,
    metadata: row.metadata,
    createdAt: row.createdAt,
    actor: {
      userId: row.userId,
      name: row.actorName,
      email: row.actorEmail,
    },
  };
}
