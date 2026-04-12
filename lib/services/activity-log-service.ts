import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";

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
