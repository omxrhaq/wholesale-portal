"use server";

import { and, eq, ilike, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthUser } from "@/lib/auth/session";
import { requireCompanyContext } from "@/lib/companies/context";
import { db } from "@/lib/db";
import { customers, orderItems, orders, products } from "@/lib/db/schema";

const placeOrderPayloadSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.uuid("Invalid product."),
        quantity: z
          .number()
          .int("Quantity must be a whole number.")
          .min(1, "Quantity must be at least 1."),
      }),
    )
    .min(1, "Add at least one product to the cart."),
});

type PlaceOrderResult = {
  success: boolean;
  error?: string;
  orderId?: string;
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
    const parsed = placeOrderPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid order payload.",
      };
    }

    if (!authUser.email) {
      return {
        success: false,
        error: "Your account has no email address and cannot be mapped to a customer.",
      };
    }

    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          ilike(customers.email, authUser.email),
          eq(customers.isActive, true),
          eq(customers.companyId, context.company.id),
        ),
      )
      .limit(1);

    if (!customer) {
      return {
        success: false,
        error: "No active customer profile matches your account email in this company.",
      };
    }

    const requestedProductIds = parsed.data.items.map((item) => item.productId);
    const selectedProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
      })
      .from(products)
      .where(
        and(
          eq(products.companyId, context.company.id),
          eq(products.isActive, true),
          inArray(products.id, requestedProductIds),
        ),
      );

    if (selectedProducts.length !== requestedProductIds.length) {
      return {
        success: false,
        error: "One or more selected products are no longer available.",
      };
    }

    const productById = new Map(selectedProducts.map((product) => [product.id, product]));
    const orderLines = parsed.data.items.map((item) => {
      const product = productById.get(item.productId);

      if (!product) {
        throw new Error("Product not found during order creation.");
      }

      const lineTotal = Number((product.price * item.quantity).toFixed(2));

      return {
        productId: product.id,
        productNameSnapshot: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        lineTotal,
      };
    });

    const totalAmount = Number(
      orderLines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2),
    );

    const [createdOrder] = await db
      .insert(orders)
      .values({
        companyId: context.company.id,
        customerId: customer.id,
        status: "new",
        totalAmount,
        notes: parsed.data.notes || null,
      })
      .returning({ id: orders.id });

    await db.insert(orderItems).values(
      orderLines.map((line) => ({
        orderId: createdOrder.id,
        productId: line.productId,
        productNameSnapshot: line.productNameSnapshot,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
    );

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
