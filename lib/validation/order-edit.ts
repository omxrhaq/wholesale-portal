import { z } from "zod";

export const orderEditSchema = z
  .object({
    notes: z.string().trim().max(1000).optional(),
    items: z
      .array(
        z.object({
          id: z.uuid("Invalid order line."),
          quantity: z
            .number()
            .int("Quantity must be a whole number.")
            .min(0, "Quantity cannot be negative.")
            .max(999999, "Quantity is too large."),
        }),
      )
      .min(1, "Order must contain at least one line."),
  })
  .refine((value) => value.items.some((item) => item.quantity > 0), {
    message: "Keep at least one order line with quantity above zero.",
    path: ["items"],
  });

export type OrderEditInput = z.infer<typeof orderEditSchema>;
