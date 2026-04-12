"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/companies/context";
import { db } from "@/lib/db";
import { orders, type OrderStatus } from "@/lib/db/schema";

type OrderActionResult = {
  success: boolean;
  error?: string;
};

const allowedStatuses: OrderStatus[] = [
  "new",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
];

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<OrderActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);

    if (!allowedStatuses.includes(status)) {
      return {
        success: false,
        error: "Invalid order status.",
      };
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(eq(orders.id, orderId), eq(orders.companyId, context.company.id)),
      )
      .returning({ id: orders.id });

    if (!updatedOrder) {
      return {
        success: false,
        error: "Order not found.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${orderId}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update status.",
    };
  }
}
