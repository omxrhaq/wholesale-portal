"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { requireCompanyContext } from "@/lib/companies/context";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { importProducts } from "@/lib/services/import-service";

type ProductImportActionResult = {
  success: boolean;
  error?: string;
  summary: {
    importedRows: number;
    updatedRows: number;
    failedRows: number;
    warnings: string[];
  };
};

export async function importProductsAction(
  payload: unknown,
): Promise<ProductImportActionResult> {
  const emptySummary = {
    importedRows: 0,
    updatedRows: 0,
    failedRows: 0,
    warnings: [] as string[],
  };

  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);

    await assertRateLimit({
      bucket: "products.import",
      key: context.userId,
      limit: 10,
      windowMs: 60_000,
    });

    const summary = await importProducts(context, payload);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/products/import");

    return {
      success: true,
      summary,
    };
  } catch (error) {
    return {
      success: false,
      error: getImportErrorMessage(error),
      summary: emptySummary,
    };
  }
}

function getImportErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    const grouped = new Map<number, string[]>();

    for (const issue of error.issues) {
      const [root, rowIndex, fieldName] = issue.path;

      if (root !== "rows" || typeof rowIndex !== "number") {
        continue;
      }

      const sourceRowNumber = rowIndex + 2;
      const current = grouped.get(sourceRowNumber) ?? [];
      const fieldPrefix =
        typeof fieldName === "string"
          ? `${formatFieldLabel(fieldName)}: `
          : "";
      current.push(`${fieldPrefix}${issue.message}`);
      grouped.set(sourceRowNumber, current);
    }

    if (grouped.size === 0) {
      const firstIssue = error.issues[0];
      return firstIssue?.message ?? "Invalid import data.";
    }

    if (grouped.size > 3) {
      return `Import contains errors in ${grouped.size} rows. Check required fields (name, SKU, unit, price) and try again.`;
    }

    const lines = [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, 3)
      .map(
        ([rowNumber, messages]) =>
          `Row ${rowNumber}: ${[...new Set(messages)].join(", ")}`,
      );

    return lines.join(" | ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Import failed.";
}

function formatFieldLabel(fieldName: string) {
  switch (fieldName) {
    case "name":
      return "Name";
    case "sku":
      return "SKU";
    case "categoryName":
      return "Category";
    case "unit":
      return "Unit";
    case "price":
      return "Price";
    case "description":
      return "Description";
    case "isActive":
      return "Active";
    default:
      return fieldName;
  }
}
