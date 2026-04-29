"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/companies/context";
import { type OrderStatus } from "@/lib/db/schema";
import { orderStatusOptions } from "@/lib/orders";
import { updateOrderStatus } from "@/lib/services/order-service";

type OrderActionResult = {
  success: boolean;
  error?: string;
};

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<OrderActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);

    if (!orderStatusOptions.includes(status)) {
      return {
        success: false,
        error: "Invalid order status.",
      };
    }

    await updateOrderStatus(context, orderId, status);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${orderId}`);
    revalidatePath("/portal");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update status.",
    };
  }
}
