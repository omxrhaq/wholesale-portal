import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";

export async function getPortalOrderHistory(
  companyId: string,
  customerId: string,
  limit = 12,
) {
  const orderRows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      notes: orders.notes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(
      and(eq(orders.companyId, companyId), eq(orders.customerId, customerId)),
    )
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  if (orderRows.length === 0) {
    return [];
  }

  const orderIds = orderRows.map((order) => order.id);
  const itemRows = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productNameSnapshot: orderItems.productNameSnapshot,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      lineTotal: orderItems.lineTotal,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

  const itemsByOrderId = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const current = itemsByOrderId.get(item.orderId) ?? [];
    current.push(item);
    itemsByOrderId.set(item.orderId, current);
  }

  return orderRows.map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) ?? [],
  }));
}
