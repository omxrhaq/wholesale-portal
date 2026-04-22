import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { productCategories, products } from "@/lib/db/schema";
import type { CompanyContext } from "@/lib/companies/context";
import { logActivity } from "@/lib/services/activity-log-service";
import {
  normalizeProductCategoryName,
  productCategorySchema,
  type ProductCategoryInput,
} from "@/lib/validation/product-category";
import { productSchema, type ProductInput } from "@/lib/validation/product";

export async function listProducts(companyId: string) {
  return db
    .select(productWithCategorySelect)
    .from(products)
    .leftJoin(
      productCategories,
      and(
        eq(products.categoryId, productCategories.id),
        eq(products.companyId, productCategories.companyId),
      ),
    )
    .where(eq(products.companyId, companyId))
    .orderBy(desc(products.isActive), asc(productCategories.name), asc(products.name));
}

export async function getProductById(companyId: string, productId: string) {
  const [product] = await db
    .select(productWithCategorySelect)
    .from(products)
    .leftJoin(
      productCategories,
      and(
        eq(products.categoryId, productCategories.id),
        eq(products.companyId, productCategories.companyId),
      ),
    )
    .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
    .limit(1);

  return product ?? null;
}

export async function listProductCategories(companyId: string) {
  return db
    .select({
      id: productCategories.id,
      name: productCategories.name,
    })
    .from(productCategories)
    .where(eq(productCategories.companyId, companyId))
    .orderBy(asc(productCategories.name));
}

export async function listProductCategoriesOverview(companyId: string) {
  return db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      createdAt: productCategories.createdAt,
      updatedAt: productCategories.updatedAt,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(productCategories)
    .leftJoin(
      products,
      and(
        eq(products.categoryId, productCategories.id),
        eq(products.companyId, productCategories.companyId),
      ),
    )
    .where(eq(productCategories.companyId, companyId))
    .groupBy(
      productCategories.id,
      productCategories.name,
      productCategories.createdAt,
      productCategories.updatedAt,
    )
    .orderBy(asc(productCategories.name));
}

export async function getProductCategoryById(companyId: string, categoryId: string) {
  const [category] = await db
    .select({
      id: productCategories.id,
      name: productCategories.name,
      createdAt: productCategories.createdAt,
      updatedAt: productCategories.updatedAt,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(productCategories)
    .leftJoin(
      products,
      and(
        eq(products.categoryId, productCategories.id),
        eq(products.companyId, productCategories.companyId),
      ),
    )
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.companyId, companyId),
      ),
    )
    .groupBy(
      productCategories.id,
      productCategories.name,
      productCategories.createdAt,
      productCategories.updatedAt,
    )
    .limit(1);

  return category ?? null;
}

export async function createProductCategory(
  context: CompanyContext,
  rawInput: ProductCategoryInput,
) {
  const input = productCategorySchema.parse(rawInput);
  const normalizedName = normalizeProductCategoryName(input.name);

  if (!normalizedName) {
    throw new Error("Category name is required.");
  }

  const [category] = await db
    .insert(productCategories)
    .values({
      companyId: context.company.id,
      name: normalizedName,
      normalizedName: normalizedName.toLowerCase(),
    })
    .returning({
      id: productCategories.id,
      name: productCategories.name,
      updatedAt: productCategories.updatedAt,
    });

  await logActivity({
    companyId: context.company.id,
    userId: context.userId,
    eventType: "product_category.created",
    entityType: "product_category",
    entityId: category.id,
    metadata: { name: category.name },
  });

  return category;
}

export async function updateProductCategory(
  context: CompanyContext,
  categoryId: string,
  rawInput: ProductCategoryInput,
) {
  const input = productCategorySchema.parse(rawInput);
  const normalizedName = normalizeProductCategoryName(input.name);

  if (!normalizedName) {
    throw new Error("Category name is required.");
  }

  const [category] = await db
    .update(productCategories)
    .set({
      name: normalizedName,
      normalizedName: normalizedName.toLowerCase(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.companyId, context.company.id),
      ),
    )
    .returning({
      id: productCategories.id,
      name: productCategories.name,
      updatedAt: productCategories.updatedAt,
    });

  if (!category) {
    throw new Error("Category not found.");
  }

  await logActivity({
    companyId: context.company.id,
    userId: context.userId,
    eventType: "product_category.updated",
    entityType: "product_category",
    entityId: category.id,
    metadata: { name: category.name },
  });

  return category;
}

export async function createProduct(
  context: CompanyContext,
  rawInput: ProductInput,
) {
  const input = productSchema.parse(rawInput);
  const categoryId = await resolveProductCategoryId(
    context.company.id,
    input.categoryName,
  );

  const [product] = await db
    .insert(products)
    .values({
      companyId: context.company.id,
      categoryId,
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
    metadata: { sku: product.sku, categoryId },
  });

  return product;
}

export async function updateProduct(
  context: CompanyContext,
  productId: string,
  rawInput: ProductInput,
) {
  const input = productSchema.parse(rawInput);
  const categoryId = await resolveProductCategoryId(
    context.company.id,
    input.categoryName,
  );

  const [product] = await db
    .update(products)
    .set({
      categoryId,
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
    metadata: { sku: product.sku, categoryId },
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

export async function resolveProductCategoryId(
  companyId: string,
  categoryName?: string | null,
) {
  const name = normalizeProductCategoryName(categoryName);

  if (!name) {
    return null;
  }

  const normalizedName = name.toLowerCase();
  const [category] = await db
    .insert(productCategories)
    .values({
      companyId,
      name,
      normalizedName,
    })
    .onConflictDoUpdate({
      target: [
        productCategories.companyId,
        productCategories.normalizedName,
      ],
      set: {
        name,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: productCategories.id,
    });

  return category.id;
}

const productWithCategorySelect = {
  id: products.id,
  companyId: products.companyId,
  categoryId: products.categoryId,
  categoryName: productCategories.name,
  name: products.name,
  sku: products.sku,
  description: products.description,
  unit: products.unit,
  price: products.price,
  isActive: products.isActive,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};
