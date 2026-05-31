import { z } from "zod";

export const portalOrderSchema = z.object({
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

export type PortalOrderInput = z.infer<typeof portalOrderSchema>;
