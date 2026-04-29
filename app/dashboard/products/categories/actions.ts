"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/companies/context";
import {
  createProductCategory,
  updateProductCategory,
} from "@/lib/services/product-service";
import {
  productCategorySchema,
  type ProductCategoryInput,
} from "@/lib/validation/product-category";

type ProductCategoryActionResult = {
  success: boolean;
  error?: string;
};

export async function createProductCategoryAction(
  values: ProductCategoryInput,
): Promise<ProductCategoryActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);
    const parsed = productCategorySchema.parse(values);

    await createProductCategory(context, parsed);
    revalidateCategoryPaths();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getActionErrorMessage(error),
    };
  }
}

export async function updateProductCategoryAction(
  categoryId: string,
  values: ProductCategoryInput,
): Promise<ProductCategoryActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);
    const parsed = productCategorySchema.parse(values);

    await updateProductCategory(context, categoryId, parsed);
    revalidateCategoryPaths();
    revalidatePath(`/dashboard/products/categories/${categoryId}/edit`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getActionErrorMessage(error),
    };
  }
}

function revalidateCategoryPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/products/new");
  revalidatePath("/dashboard/products/categories");
  revalidatePath("/portal");
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("product_categories_company_normalized_idx")) {
      return "This category already exists within your company.";
    }

    return error.message;
  }

  return "Something went wrong. Please try again.";
}
