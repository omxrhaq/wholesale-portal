"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/companies/context";
import { type OrderStatus } from "@/lib/db/schema";
import { orderStatusOptions } from "@/lib/orders";
import { updateOrderDraft, updateOrderStatus } from "@/lib/services/order-service";
import type { OrderEditInput } from "@/lib/validation/order-edit";

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

export async function updateOrderDraftAction(
  orderId: string,
  values: OrderEditInput,
): Promise<OrderActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);

    await updateOrderDraft(context, orderId, values);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${orderId}`);
    revalidatePath("/portal");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update order.",
    };
  }
}
