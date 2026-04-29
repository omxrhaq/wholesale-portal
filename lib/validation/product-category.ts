import { z } from "zod";

export const productCategoryNameSchema = z
  .string()
  .trim()
  .max(120, "Category name must be 120 characters or less.");

export const productCategorySchema = z.object({
  name: productCategoryNameSchema.min(1, "Category name is required."),
});

export type ProductCategoryInput = z.infer<typeof productCategorySchema>;

export function normalizeProductCategoryName(value?: string | null) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  return normalized || null;
}
