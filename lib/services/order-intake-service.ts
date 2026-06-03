import { and, eq, inArray, sql } from "drizzle-orm";

import type { CompanyContext } from "@/lib/companies/context";
import { db, type DbExecutor } from "@/lib/db";
import { customers, orderItems, orders, products } from "@/lib/db/schema";
import {
  buildOrderLineDrafts,
  calculateOrderTotal,
  normalizeProductQuantities,
  type OrderLineDraft,
  type OrderProductQuantity,
} from "@/lib/order-intake";
import { logActivityTx } from "@/lib/services/activity-log-service";
import type { PortalOrderInput } from "@/lib/validation/portal-order";

export async function createPortalOrder(
  context: CompanyContext,
  portalUserId: string,
  input: PortalOrderInput,
) {
  const customer = await getActivePortalCustomer(context.company.id, portalUserId);
  const createdOrder = await db.transaction(async (tx) => {
    const orderLines = await buildActiveOrderLines(
      context.company.id,
      normalizeProductQuantities(input.items),
      {
        requireEveryProduct: true,
        executor: tx,
      },
    );
    const totalAmount = calculateOrderTotal(orderLines);

    await decrementStockForOrderLines(tx, context.company.id, orderLines);

    const [newOrder] = await tx
      .insert(orders)
      .values({
        companyId: context.company.id,
        customerId: customer.id,
        status: "new",
        totalAmount,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        inventoryReserved: true,
      })
      .returning({ id: orders.id });

    await tx.insert(orderItems).values(
      orderLines.map((line) => ({
        orderId: newOrder.id,
        productId: line.productId,
        productNameSnapshot: line.productNameSnapshot,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
    );

    await logActivityTx(tx, {
      companyId: context.company.id,
      userId: context.userId,
      eventType: "order.created",
      entityId: newOrder.id,
      metadata: {
        nextStatus: "new",
        actorRole: context.companyUser.role,
      },
    });

    return newOrder;
  });

  return createdOrder;
}

export async function buildPortalReorderDraft(
  context: CompanyContext,
  portalUserId: string,
  sourceOrderId: string,
) {
  const customer = await getActivePortalCustomer(context.company.id, portalUserId);
  const [sourceOrder] = await db
    .select({
      id: orders.id,
      notes: orders.notes,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, sourceOrderId),
        eq(orders.companyId, context.company.id),
        eq(orders.customerId, customer.id),
      ),
    )
    .limit(1);

  if (!sourceOrder) {
    throw new Error("Order not found.");
  }

  const sourceItems = await db
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, sourceOrder.id));

  if (sourceItems.length === 0) {
    throw new Error("This order has no lines to reorder.");
  }

  const orderLines = await buildActiveOrderLines(
    context.company.id,
    normalizeProductQuantities(sourceItems),
    {
      requireEveryProduct: false,
    },
  );

  if (orderLines.length === 0) {
    throw new Error("None of the products from this order are currently available.");
  }

  return {
    sourceOrderId: sourceOrder.id,
    notes: sourceOrder.notes,
    items: orderLines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
    skippedLineCount: sourceItems.length - orderLines.length,
    totalAmount: calculateOrderTotal(orderLines),
  };
}

async function getActivePortalCustomer(companyId: string, portalUserId: string) {
  const [customer] = await db
    .select({
      id: customers.id,
    })
    .from(customers)
    .where(
      and(
        eq(customers.companyId, companyId),
        eq(customers.portalUserId, portalUserId),
        eq(customers.isActive, true),
      ),
    )
    .limit(1);

  if (!customer) {
    throw new Error("No active customer profile is linked to your account in this company.");
  }

  return customer;
}

async function buildActiveOrderLines(
  companyId: string,
  requestedItems: OrderProductQuantity[],
  {
    requireEveryProduct,
    executor = db,
  }: {
    requireEveryProduct: boolean;
    executor?: DbExecutor;
  },
): Promise<OrderLineDraft[]> {
  const requestedProductIds = requestedItems.map((item) => item.productId);

  if (requestedProductIds.length === 0) {
    return [];
  }

  const selectedProducts = await executor
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      stockQuantity: products.stockQuantity,
    })
    .from(products)
    .where(
      and(
        eq(products.companyId, companyId),
        eq(products.isActive, true),
        inArray(products.id, requestedProductIds),
      ),
    );

  return buildOrderLineDrafts(requestedItems, selectedProducts, {
    requireEveryProduct,
  });
}

async function decrementStockForOrderLines(
  executor: DbExecutor,
  companyId: string,
  lines: OrderLineDraft[],
) {
  for (const line of lines) {
    const [updatedProduct] = await executor
      .update(products)
      .set({
        stockQuantity: sql`${products.stockQuantity} - ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, line.productId),
          eq(products.companyId, companyId),
          sql`${products.stockQuantity} >= ${line.quantity}`,
        ),
      )
      .returning({ id: products.id });

    if (!updatedProduct) {
      throw new Error(`Insufficient stock for ${line.productNameSnapshot}.`);
    }
  }
}
