"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyContext } from "@/lib/companies/context";
import {
  createProduct,
  deactivateProduct,
  updateProduct,
} from "@/lib/services/product-service";
import { productSchema, type ProductInput } from "@/lib/validation/product";

type ProductActionResult = {
  success: boolean;
  error?: string;
};

export async function createProductAction(
  values: ProductInput,
): Promise<ProductActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);
    const parsed = productSchema.parse(values);

    await createProduct(context, parsed);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getActionErrorMessage(error),
    };
  }
}

export async function updateProductAction(
  productId: string,
  values: ProductInput,
): Promise<ProductActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);
    const parsed = productSchema.parse(values);

    await updateProduct(context, productId, parsed);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${productId}/edit`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getActionErrorMessage(error),
    };
  }
}

export async function deactivateProductAction(productId: string) {
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);

  await deactivateProduct(context, productId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("products_company_sku_idx")) {
      return "This SKU already exists within your company.";
    }

    return error.message;
  }

  return "Something went wrong. Please try again.";
}
