import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  activityLogs,
  customers,
  orderItems,
  orders,
  profiles,
  type OrderStatus,
} from "@/lib/db/schema";
import type { CompanyContext } from "@/lib/companies/context";
import { canTransitionOrderStatus } from "@/lib/orders";

type ListOrdersOptions = {
  companyId: string;
  status?: OrderStatus | "all";
  statuses?: OrderStatus[];
  query?: string;
  sort?:
    | "created_desc"
    | "created_asc"
    | "updated_desc"
    | "updated_asc"
    | "amount_desc"
    | "amount_asc"
    | "customer_asc"
    | "customer_desc"
    | "status_asc"
    | "status_desc"
    | "order_desc"
    | "order_asc"
    | "items_desc"
    | "items_asc";
  page?: number;
  pageSize?: number;
};

export type OrderTimelineEntry = {
  id: string;
  type: "created" | "status_changed";
  occurredAt: Date;
  actor: {
    userId: string | null;
    name: string;
    email: string | null;
    role: string | null;
  };
  previousStatus: OrderStatus | null;
  nextStatus: OrderStatus;
};

export async function listOrders({
  companyId,
  status = "all",
  statuses,
  query = "",
  sort = "created_desc",
  page = 1,
  pageSize = 10,
}: ListOrdersOptions) {
  const filters = [eq(orders.companyId, companyId)];
  const trimmedQuery = query.trim();

  if (statuses && statuses.length > 0) {
    filters.push(inArray(orders.status, statuses));
  } else if (status !== "all") {
    filters.push(eq(orders.status, status));
  }

  if (trimmedQuery) {
    const searchPattern = `%${trimmedQuery}%`;

    filters.push(
      or(
        ilike(customers.name, searchPattern),
        ilike(customers.email, searchPattern),
        sql`cast(${orders.id} as text) ilike ${searchPattern}`,
      )!,
    );
  }

  const whereClause = and(...filters);
  const orderByClause =
    sort === "created_asc"
      ? [asc(orders.createdAt)]
      : sort === "amount_desc"
        ? [desc(orders.totalAmount)]
        : sort === "amount_asc"
          ? [asc(orders.totalAmount)]
          : sort === "updated_desc"
            ? [desc(orders.updatedAt)]
            : sort === "updated_asc"
              ? [asc(orders.updatedAt)]
              : sort === "customer_asc"
                ? [asc(customers.name)]
                : sort === "customer_desc"
                  ? [desc(customers.name)]
                  : sort === "order_desc"
                    ? [desc(orders.id)]
                    : sort === "order_asc"
                      ? [asc(orders.id)]
                      : sort === "status_asc"
                        ? [asc(orders.status)]
                        : sort === "status_desc"
                          ? [desc(orders.status)]
                          : sort === "items_desc"
                            ? [desc(sql`item_count`)]
                            : sort === "items_asc"
                              ? [asc(sql`item_count`)]
                              : [desc(orders.createdAt)];

  const baseQuery = db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      notes: orders.notes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerId: customers.id,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      itemCount: sql<number>`(
        select count(*)
        from ${orderItems}
        where ${orderItems.orderId} = ${orders.id}
      )`.as("item_count"),
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(whereClause);

  const [summary] = await db
    .select({
      totalCount: sql<number>`count(*)`.as("total_count"),
      totalAmount: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`.as(
        "total_amount",
      ),
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(whereClause);

  const rows = await baseQuery
    .orderBy(...orderByClause)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows,
    totalCount: Number(summary?.totalCount ?? 0),
    totalAmount: Number(summary?.totalAmount ?? 0),
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(Number(summary?.totalCount ?? 0) / pageSize)),
  };
}

export async function getOrderViewCounts({
  companyId,
  query = "",
}: {
  companyId: string;
  query?: string;
}) {
  const baseFilters = [eq(orders.companyId, companyId)];
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    const searchPattern = `%${trimmedQuery}%`;

    baseFilters.push(
      or(
        ilike(customers.name, searchPattern),
        ilike(customers.email, searchPattern),
        sql`cast(${orders.id} as text) ilike ${searchPattern}`,
      )!,
    );
  }

  const rows = await db
    .select({
      status: orders.status,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(...baseFilters))
    .groupBy(orders.status);

  const byStatus = new Map(rows.map((row) => [row.status, Number(row.count)]));
  const statusCounts: Record<OrderStatus, number> = {
    new: byStatus.get("new") ?? 0,
    confirmed: byStatus.get("confirmed") ?? 0,
    processing: byStatus.get("processing") ?? 0,
    completed: byStatus.get("completed") ?? 0,
    cancelled: byStatus.get("cancelled") ?? 0,
  };
  const all = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);

  return {
    all,
    open:
      statusCounts.new + statusCounts.confirmed + statusCounts.processing,
    statusCounts,
  };
}

export async function getOrderOverviewStats(companyId: string) {
  const [summary] = await db
    .select({
      totalCount: sql<number>`count(*)`.as("total_count"),
      totalAmount: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`.as(
        "total_amount",
      ),
      openCount: sql<number>`
        coalesce(
          sum(
            case
              when ${orders.status} in ('new', 'confirmed', 'processing') then 1
              else 0
            end
          ),
          0
        )
      `.as("open_count"),
      openAmount: sql<number>`
        coalesce(
          sum(
            case
              when ${orders.status} in ('new', 'confirmed', 'processing') then ${orders.totalAmount}
              else 0
            end
          ),
          0
        )
      `.as("open_amount"),
    })
    .from(orders)
    .where(eq(orders.companyId, companyId));

  return {
    totalCount: Number(summary?.totalCount ?? 0),
    totalAmount: Number(summary?.totalAmount ?? 0),
    openCount: Number(summary?.openCount ?? 0),
    openAmount: Number(summary?.openAmount ?? 0),
  };
}

export async function getOrderById(companyId: string, orderId: string) {
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      notes: orders.notes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerId: customers.id,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
    .limit(1);

  if (!order) {
    return null;
  }

  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productNameSnapshot: orderItems.productNameSnapshot,
      unitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
      lineTotal: orderItems.lineTotal,
      createdAt: orderItems.createdAt,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(desc(orderItems.createdAt));

  const activity = await db
    .select({
      id: activityLogs.id,
      eventType: activityLogs.eventType,
      userId: activityLogs.userId,
      createdAt: activityLogs.createdAt,
      metadata: activityLogs.metadata,
      actorName: profiles.fullName,
      actorEmail: profiles.email,
    })
    .from(activityLogs)
    .leftJoin(profiles, eq(activityLogs.userId, profiles.id))
    .where(
      and(
        eq(activityLogs.companyId, companyId),
        eq(activityLogs.entityType, "order"),
        eq(activityLogs.entityId, order.id),
        inArray(activityLogs.eventType, ["order.created", "order.status_changed"]),
      ),
    )
    .orderBy(asc(activityLogs.createdAt));

  const timeline = buildOrderTimeline(order, activity);

  return {
    ...order,
    items,
    timeline,
  };
}

export async function updateOrderStatus(
  context: CompanyContext,
  orderId: string,
  nextStatus: OrderStatus,
) {
  const [currentOrder] = await db
    .select({
      id: orders.id,
      status: orders.status,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.companyId, context.company.id)))
    .limit(1);

  if (!currentOrder) {
    throw new Error("Order not found.");
  }

  if (currentOrder.status === nextStatus) {
    return currentOrder;
  }

  if (!canTransitionOrderStatus(currentOrder.status, nextStatus)) {
    throw new Error(
      `Invalid status transition: ${currentOrder.status} -> ${nextStatus}.`,
    );
  }

  await db.transaction(async (tx) => {
    const [updatedOrder] = await tx
      .update(orders)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.companyId, context.company.id),
          eq(orders.status, currentOrder.status),
        ),
      )
      .returning({
        id: orders.id,
        status: orders.status,
      });

    if (!updatedOrder) {
      throw new Error("Order status changed before this update. Refresh and try again.");
    }

    await tx.insert(activityLogs).values({
      companyId: context.company.id,
      userId: context.userId,
      eventType: "order.status_changed",
      entityType: "order",
      entityId: orderId,
      metadata: {
        previousStatus: currentOrder.status,
        nextStatus,
        actorRole: context.companyUser.role,
      },
    });
  });

  return {
    id: orderId,
    status: nextStatus,
  };
}

function buildOrderTimeline(
  order: {
    id: string;
    status: OrderStatus;
    createdAt: Date;
    customerName: string;
    customerEmail: string | null;
  },
  activity: Array<{
    id: string;
    eventType: string;
    userId: string;
    createdAt: Date;
    metadata: Record<string, unknown> | null;
    actorName: string | null;
    actorEmail: string | null;
  }>,
): OrderTimelineEntry[] {
  const createdEvent = activity.find((entry) => entry.eventType === "order.created");
  const timeline: OrderTimelineEntry[] = [];

  if (createdEvent) {
    timeline.push({
      id: createdEvent.id,
      type: "created",
      occurredAt: createdEvent.createdAt,
      actor: {
        userId: createdEvent.userId,
        name: createdEvent.actorName ?? createdEvent.actorEmail ?? order.customerName,
        email: createdEvent.actorEmail ?? order.customerEmail,
        role: getMetadataString(createdEvent.metadata, "actorRole"),
      },
      previousStatus: null,
      nextStatus: getMetadataOrderStatus(createdEvent.metadata, "nextStatus") ?? "new",
    });
  } else {
    timeline.push({
      id: `${order.id}-created`,
      type: "created",
      occurredAt: order.createdAt,
      actor: {
        userId: null,
        name: order.customerName,
        email: order.customerEmail,
        role: "buyer",
      },
      previousStatus: null,
      nextStatus: "new",
    });
  }

  for (const entry of activity) {
    if (entry.eventType !== "order.status_changed") {
      continue;
    }

    const nextStatus = getMetadataOrderStatus(entry.metadata, "nextStatus");
    if (!nextStatus) {
      continue;
    }

    timeline.push({
      id: entry.id,
      type: "status_changed",
      occurredAt: entry.createdAt,
      actor: {
        userId: entry.userId,
        name: entry.actorName ?? entry.actorEmail ?? "Unknown user",
        email: entry.actorEmail,
        role: getMetadataString(entry.metadata, "actorRole"),
      },
      previousStatus: getMetadataOrderStatus(entry.metadata, "previousStatus"),
      nextStatus,
    });
  }

  return timeline.sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
}

function getMetadataOrderStatus(
  metadata: Record<string, unknown> | null,
  key: "previousStatus" | "nextStatus",
): OrderStatus | null {
  const value = metadata?.[key];

  if (
    value === "new" ||
    value === "confirmed" ||
    value === "processing" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }

  return null;
}

function getMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}
