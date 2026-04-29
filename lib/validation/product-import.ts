import { z } from "zod";

import { productCategoryNameSchema } from "@/lib/validation/product-category";

export const importedProductRowSchema = z.object({
  sourceRowNumber: z.number().int().positive(),
  name: z.string().trim().min(2, "Name is required."),
  sku: z.string().trim().min(1, "SKU is required."),
  categoryName: productCategoryNameSchema.optional(),
  description: z.string().trim().optional(),
  unit: z.string().trim().min(1, "Unit is required."),
  price: z.number().positive("Price must be greater than 0."),
  isActive: z.boolean().default(true),
});

export const productImportPayloadSchema = z.object({
  fileName: z.string().trim().min(1),
  rows: z.array(importedProductRowSchema).min(1).max(2000),
});

export type ImportedProductRowInput = z.infer<typeof importedProductRowSchema>;
export type ProductImportPayload = z.infer<typeof productImportPayloadSchema>;
