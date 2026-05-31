import { desc, eq, sql } from "drizzle-orm";

import type { CompanyContext } from "@/lib/companies/context";
import { db, type DbTransaction } from "@/lib/db";
import { imports, products } from "@/lib/db/schema";
import { resolveProductCategoryId } from "@/lib/services/product-service";
import {
  productImportPayloadSchema,
} from "@/lib/validation/product-import";

export type ProductImportSummary = {
  importedRows: number;
  updatedRows: number;
  failedRows: number;
  warnings: string[];
};

export async function listImports(companyId: string) {
  return db
    .select()
    .from(imports)
    .where(eq(imports.companyId, companyId))
    .orderBy(desc(imports.createdAt));
}

export async function importProducts(
  context: CompanyContext,
  payload: unknown,
) {
  const parsed = productImportPayloadSchema.parse(payload);
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
    .returning({ id: imports.id });

  try {
    const summary = await db.transaction(async (tx) => {
      const warnings: string[] = [];
      const seenSkus = new Set<string>();
      const categoryCache = new Map<string, string | null>();
      const existingProducts = await tx
        .select({
          id: products.id,
          sku: products.sku,
        })
        .from(products)
        .where(eq(products.companyId, context.company.id));

      const existingBySku = new Map(
        existingProducts.map((product) => [product.sku.toLowerCase(), product]),
      );

      const upsertRows: Array<{
        companyId: string;
        categoryId: string | null;
        name: string;
        sku: string;
        description: string | null;
        unit: string;
        price: number;
        isActive: boolean;
        updatedAt: Date;
      }> = [];
      let updatedRows = 0;
      let failedRows = 0;

      for (const row of parsed.rows) {
        const normalizedSku = row.sku.trim().toLowerCase();

        if (seenSkus.has(normalizedSku)) {
          failedRows += 1;
          warnings.push(
            `Row ${row.sourceRowNumber}: duplicate SKU in the same file (${row.sku}).`,
          );
          continue;
        }

        seenSkus.add(normalizedSku);

        const categoryId = await getCachedCategoryId(
          context.company.id,
          row.categoryName,
          categoryCache,
          tx,
        );

        if (existingBySku.has(normalizedSku)) {
          updatedRows += 1;
        }

        upsertRows.push({
          companyId: context.company.id,
          categoryId,
          name: row.name,
          sku: row.sku,
          description: row.description || null,
          unit: row.unit,
          price: row.price,
          isActive: row.isActive,
          updatedAt: new Date(),
        });
      }

      if (upsertRows.length > 0) {
        await tx
          .insert(products)
          .values(upsertRows)
          .onConflictDoUpdate({
            target: [products.companyId, products.sku],
            set: {
              categoryId: sql`excluded.category_id`,
              name: sql`excluded.name`,
              sku: sql`excluded.sku`,
              description: sql`excluded.description`,
              unit: sql`excluded.unit`,
              price: sql`excluded.price`,
              isActive: sql`excluded.is_active`,
              updatedAt: new Date(),
            },
          });
      }

      return {
        importedRows: upsertRows.length,
        updatedRows,
        failedRows,
        warnings,
      } satisfies ProductImportSummary;
    });

    await updateImportJob(importJob.id, {
      status: "completed",
      importedRows: summary.importedRows,
      failedRows: summary.failedRows,
    });

    return summary;
  } catch (error) {
    await updateImportJob(importJob.id, {
      status: "failed",
      importedRows: 0,
      failedRows: parsed.rows.length,
    });
    throw error;
  }
}

async function updateImportJob(
  importId: string,
  values: {
    status: "completed" | "failed";
    importedRows: number;
    failedRows: number;
  },
) {
  await db
    .update(imports)
    .set(values)
    .where(eq(imports.id, importId));
}

async function getCachedCategoryId(
  companyId: string,
  categoryName: string | undefined,
  cache: Map<string, string | null>,
  executor: DbTransaction,
) {
  const normalizedName = categoryName?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";

  if (!normalizedName) {
    return null;
  }

  if (cache.has(normalizedName)) {
    return cache.get(normalizedName) ?? null;
  }

  const categoryId = await resolveProductCategoryId(companyId, categoryName, executor);
  cache.set(normalizedName, categoryId);

  return categoryId;
}
