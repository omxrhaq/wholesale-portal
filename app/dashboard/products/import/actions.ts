"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { requireCompanyContext } from "@/lib/companies/context";
import { db } from "@/lib/db";
import { imports, products } from "@/lib/db/schema";
import { productImportPayloadSchema } from "@/lib/validation/product-import";

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
    const parsed = productImportPayloadSchema.parse(payload);
    const warnings: string[] = [];
    const seenSkus = new Set<string>();

    const [importJob] = await db
      .insert(imports)
      .values({
        companyId: context.company.id,
        fileName: parsed.fileName,
        status: "processing",
        totalRows: parsed.rows.length,
        importedRows: 0,
        failedRows: 0,
      })
      .returning();

    const existingProducts = await db
      .select({
        id: products.id,
        sku: products.sku,
      })
      .from(products)
      .where(eq(products.companyId, context.company.id));

    const existingBySku = new Map(
      existingProducts.map((product) => [product.sku.toLowerCase(), product]),
    );

    let importedRows = 0;
    let updatedRows = 0;
    let failedRows = 0;

    for (const row of parsed.rows) {
      const normalizedSku = row.sku.trim().toLowerCase();

      if (seenSkus.has(normalizedSku)) {
        failedRows += 1;
        warnings.push(`Row ${row.sourceRowNumber}: duplicate SKU in the same file (${row.sku}).`);
        continue;
      }

      seenSkus.add(normalizedSku);

      const existing = existingBySku.get(normalizedSku);

      if (existing) {
        await db
          .update(products)
          .set({
            name: row.name,
            sku: row.sku,
            description: row.description || null,
            unit: row.unit,
            price: row.price,
            isActive: row.isActive,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(products.id, existing.id),
              eq(products.companyId, context.company.id),
            ),
          );

        importedRows += 1;
        updatedRows += 1;
        continue;
      }

      await db.insert(products).values({
        companyId: context.company.id,
        name: row.name,
        sku: row.sku,
        description: row.description || null,
        unit: row.unit,
        price: row.price,
        isActive: row.isActive,
      });

      importedRows += 1;
    }

    await db
      .update(imports)
      .set({
        status: "completed",
        importedRows,
        failedRows,
      })
      .where(eq(imports.id, importJob.id));

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/products/import");

    return {
      success: true,
      summary: {
        importedRows,
        updatedRows,
        failedRows,
        warnings,
      },
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
