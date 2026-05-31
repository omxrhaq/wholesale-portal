import { and, desc, eq } from "drizzle-orm";

import { db, type DbExecutor } from "@/lib/db";
import { activityLogs, profiles } from "@/lib/db/schema";

export type ActivityEntityType = "customer" | "order" | "product" | "product_category";

export type ActivityFieldChange = {
  field: string;
  before: unknown;
  after: unknown;
};

type ActivityMetadataMap = {
  "customer.created": {
    email: string | null;
    changes: ActivityFieldChange[];
  };
  "customer.updated": {
    email: string | null;
    changes: ActivityFieldChange[];
  };
  "customer.deactivated": {
    email: string | null;
    changes: ActivityFieldChange[];
  };
  "customer.reactivated": {
    email: string | null;
    changes: ActivityFieldChange[];
  };
  "customer.portal_login_created": {
    email: string;
    portalUserId: string;
  };
  "customer.portal_password_updated": {
    email: string;
    portalUserId: string;
  };
  "customer.portal_setup_email_sent": {
    email: string;
  };
  "customer.portal_setup_link_generated": {
    email: string;
  };
  "product_category.created": {
    changes: ActivityFieldChange[];
  };
  "product_category.updated": {
    changes: ActivityFieldChange[];
  };
  "product.created": {
    sku: string;
    categoryId: string | null;
    changes: ActivityFieldChange[];
  };
  "product.updated": {
    sku: string;
    categoryId: string | null;
    changes: ActivityFieldChange[];
  };
  "product.deactivated": {
    sku: string;
    changes: ActivityFieldChange[];
  };
  "order.created": {
    nextStatus: string;
    actorRole: string;
  };
  "order.status_changed": {
    previousStatus: string;
    nextStatus: string;
    actorRole: string;
  };
  "order.updated": {
    actorRole: string;
    changes: ActivityFieldChange[];
    itemChanges: Array<{
      productName: string;
      beforeQuantity: number;
      afterQuantity: number;
    }>;
    removedItems: Array<{
      productName: string;
    }>;
  };
};

type ActivityEntityByEvent = {
  "customer.created": "customer";
  "customer.updated": "customer";
  "customer.deactivated": "customer";
  "customer.reactivated": "customer";
  "customer.portal_login_created": "customer";
  "customer.portal_password_updated": "customer";
  "customer.portal_setup_email_sent": "customer";
  "customer.portal_setup_link_generated": "customer";
  "product_category.created": "product_category";
  "product_category.updated": "product_category";
  "product.created": "product";
  "product.updated": "product";
  "product.deactivated": "product";
  "order.created": "order";
  "order.status_changed": "order";
  "order.updated": "order";
};

export type ActivityEventType = keyof ActivityMetadataMap;

type LogActivityInput<TEventType extends ActivityEventType = ActivityEventType> = {
  companyId: string;
  userId: string;
  eventType: TEventType;
  entityId: string;
  metadata: ActivityMetadataMap[TEventType];
};

const entityTypeByEvent: ActivityEntityByEvent = {
  "customer.created": "customer",
  "customer.updated": "customer",
  "customer.deactivated": "customer",
  "customer.reactivated": "customer",
  "customer.portal_login_created": "customer",
  "customer.portal_password_updated": "customer",
  "customer.portal_setup_email_sent": "customer",
  "customer.portal_setup_link_generated": "customer",
  "product_category.created": "product_category",
  "product_category.updated": "product_category",
  "product.created": "product",
  "product.updated": "product",
  "product.deactivated": "product",
  "order.created": "order",
  "order.status_changed": "order",
  "order.updated": "order",
};

async function insertActivity<TEventType extends ActivityEventType>(
  executor: DbExecutor,
  input: LogActivityInput<TEventType>,
) {
  await executor.insert(activityLogs).values({
    companyId: input.companyId,
    userId: input.userId,
    eventType: input.eventType,
    entityType: entityTypeByEvent[input.eventType],
    entityId: input.entityId,
    metadata: input.metadata,
  });
}

export async function logActivity<TEventType extends ActivityEventType>(
  input: LogActivityInput<TEventType>,
) {
  await insertActivity(db, input);
}

export async function logActivityTx<TEventType extends ActivityEventType>(
  executor: DbExecutor,
  input: LogActivityInput<TEventType>,
) {
  await insertActivity(executor, input);
}

export type ActivityLogEntry = {
  id: string;
  eventType: ActivityEventType;
  entityType: ActivityEntityType;
  entityId: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
  actor: {
    userId: string;
    name: string | null;
    email: string | null;
  };
};

export function buildFieldChanges<
  TBefore extends Record<string, unknown>,
  TAfter extends Record<string, unknown>,
>(
  before: TBefore,
  after: TAfter,
  fields: Array<{
    key: keyof TAfter & string;
    field?: string;
  }>,
) {
  const changes: ActivityFieldChange[] = [];

  for (const entry of fields) {
    const previousValue = before[entry.key];
    const nextValue = after[entry.key];

    if (!areActivityValuesEqual(previousValue, nextValue)) {
      changes.push({
        field: entry.field ?? entry.key,
        before: previousValue,
        after: nextValue,
      });
    }
  }

  return changes;
}

export async function listActivityForEntity(
  companyId: string,
  entityType: ActivityEntityType,
  entityId: string,
  limit = 20,
) {
  const rows = await db
    .select({
      id: activityLogs.id,
      eventType: activityLogs.eventType,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      createdAt: activityLogs.createdAt,
      metadata: activityLogs.metadata,
      userId: activityLogs.userId,
      actorName: profiles.fullName,
      actorEmail: profiles.email,
    })
    .from(activityLogs)
    .leftJoin(profiles, eq(activityLogs.userId, profiles.id))
    .where(
      and(
        eq(activityLogs.companyId, companyId),
        eq(activityLogs.entityType, entityType),
        eq(activityLogs.entityId, entityId),
      ),
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  return rows.map(mapActivityRow);
}

export async function listRecentActivity(companyId: string, limit = 12) {
  const rows = await db
    .select({
      id: activityLogs.id,
      eventType: activityLogs.eventType,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      createdAt: activityLogs.createdAt,
      metadata: activityLogs.metadata,
      userId: activityLogs.userId,
      actorName: profiles.fullName,
      actorEmail: profiles.email,
    })
    .from(activityLogs)
    .leftJoin(profiles, eq(activityLogs.userId, profiles.id))
    .where(eq(activityLogs.companyId, companyId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  return rows.map(mapActivityRow);
}

function mapActivityRow(row: {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
  userId: string;
  actorName: string | null;
  actorEmail: string | null;
}): ActivityLogEntry {
  return {
    id: row.id,
    eventType: row.eventType as ActivityEventType,
    entityType: row.entityType as ActivityEntityType,
    entityId: row.entityId,
    createdAt: row.createdAt,
    metadata: row.metadata,
    actor: {
      userId: row.userId,
      name: row.actorName,
      email: row.actorEmail,
    },
  };
}

function areActivityValuesEqual(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
