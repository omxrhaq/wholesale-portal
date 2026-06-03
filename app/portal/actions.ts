"use server";

import { revalidatePath } from "next/cache";

import { requireAuthUser } from "@/lib/auth/session";
import { requireCompanyContext } from "@/lib/companies/context";
import {
  buildPortalReorderDraft,
  createPortalOrder,
} from "@/lib/services/order-intake-service";
import { portalOrderSchema } from "@/lib/validation/portal-order";

type PlaceOrderResult = {
  success: boolean;
  error?: string;
  orderId?: string;
};

type ReorderDraftResult = {
  success: boolean;
  error?: string;
  sourceOrderId?: string;
  notes?: string | null;
  items?: Array<{
    productId: string;
    quantity: number;
  }>;
  skippedLineCount?: number;
};

export async function placePortalOrderAction(
  payload: unknown,
): Promise<PlaceOrderResult> {
  try {
    const context = await requireCompanyContext([
      "buyer",
      "wholesaler_owner",
      "wholesaler_staff",
    ]);
    const authUser = await requireAuthUser();
    const parsed = portalOrderSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid order payload.",
      };
    }

    const createdOrder = await createPortalOrder(context, authUser.id, parsed.data);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/portal");

    return {
      success: true,
      orderId: createdOrder.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Order placement failed.",
    };
  }
}

export async function buildPortalReorderDraftAction(
  orderId: string,
): Promise<ReorderDraftResult> {
  try {
    const context = await requireCompanyContext([
      "buyer",
      "wholesaler_owner",
      "wholesaler_staff",
    ]);
    const authUser = await requireAuthUser();
    const draft = await buildPortalReorderDraft(context, authUser.id, orderId);

    return {
      success: true,
      sourceOrderId: draft.sourceOrderId,
      notes: draft.notes,
      items: draft.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      skippedLineCount: draft.skippedLineCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not prepare reorder.",
    };
  }
}
