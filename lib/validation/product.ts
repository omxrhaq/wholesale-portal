import { z } from "zod";

import { productCategoryNameSchema } from "@/lib/validation/product-category";

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required.")
    .max(120, "SKU must be 120 characters or less."),
  categoryName: productCategoryNameSchema.optional(),
  description: z.string().trim().max(2000, "Description is too long.").optional(),
  unit: z.string().trim().min(1, "Unit is required.").max(50),
  price: z.number().positive("Price must be greater than 0."),
  isActive: z.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;
