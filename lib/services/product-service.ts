import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import type { CompanyContext } from "@/lib/companies/context";
import { logActivity } from "@/lib/services/activity-log-service";
import { productSchema, type ProductInput } from "@/lib/validation/product";

export async function listProducts(companyId: string) {
  return db
    .select()
    .from(products)
    .where(eq(products.companyId, companyId))
    .orderBy(desc(products.isActive), asc(products.name));
}

export async function getProductById(companyId: string, productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
    .limit(1);

  return product ?? null;
}

export async function createProduct(
  context: CompanyContext,
  rawInput: ProductInput,
) {
  const input = productSchema.parse(rawInput);

  const [product] = await db
    .insert(products)
    .values({
      companyId: context.company.id,
      name: input.name,
      sku: input.sku,
      description: input.description || null,
      unit: input.unit,
      price: input.price,
      isActive: input.isActive,
    })
    .returning();

  await logActivity({
    companyId: context.company.id,
    userId: context.userId,
    eventType: "product.created",
    entityType: "product",
    entityId: product.id,
    metadata: { sku: product.sku },
  });

  return product;
}

export async function updateProduct(
  context: CompanyContext,
  productId: string,
  rawInput: ProductInput,
) {
  const input = productSchema.parse(rawInput);

  const [product] = await db
    .update(products)
    .set({
      name: input.name,
      sku: input.sku,
      description: input.description || null,
      unit: input.unit,
      price: input.price,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.companyId, context.company.id)))
    .returning();

  if (!product) {
    throw new Error("Product not found.");
  }

  await logActivity({
    companyId: context.company.id,
    userId: context.userId,
    eventType: "product.updated",
    entityType: "product",
    entityId: product.id,
    metadata: { sku: product.sku },
  });

  return product;
}

export async function deactivateProduct(context: CompanyContext, productId: string) {
  const [product] = await db
    .update(products)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.companyId, context.company.id)))
    .returning();

  if (!product) {
    throw new Error("Product not found.");
  }

  await logActivity({
    companyId: context.company.id,
    userId: context.userId,
    eventType: "product.deactivated",
    entityType: "product",
    entityId: product.id,
    metadata: { sku: product.sku },
  });
}
