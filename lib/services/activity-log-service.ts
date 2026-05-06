import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLogs, profiles } from "@/lib/db/schema";

type LogActivityInput = {
  companyId: string;
  userId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(input: LogActivityInput) {
  await db.insert(activityLogs).values(input);
}

export type ActivityFieldChange = {
  field: string;
  before: unknown;
  after: unknown;
};

export type ActivityLogEntry = {
  id: string;
  eventType: string;
  entityType: string;
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
  entityType: string,
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
    eventType: row.eventType,
    entityType: row.entityType,
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
