import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CompanyContext } from "@/lib/companies/context";
import { db } from "@/lib/db";
import {
  companies,
  companyUsers,
  customers,
  orderItems,
  orders,
  products,
  profiles,
} from "@/lib/db/schema";
import { createPortalOrder } from "@/lib/services/order-intake-service";
import {
  updateOrderDraft,
  updateOrderStatus,
} from "@/lib/services/order-service";

type TestData = {
  context: CompanyContext;
  companyId: string;
  buyerUserId: string;
  productId: string;
};

let testData: TestData | null = null;
const profileIds = new Set<string>();

beforeEach(async () => {
  testData = await seedOrderStockTestData();
});

afterEach(async () => {
  if (testData) {
    await db.delete(companies).where(eq(companies.id, testData.companyId));
  }

  for (const profileId of profileIds) {
    await db.delete(profiles).where(eq(profiles.id, profileId));
  }

  profileIds.clear();
  testData = null;
});

describe("order stock integration", () => {
  it("reserves product stock when a buyer checks out", async () => {
    const data = requireTestData();

    const order = await createPortalOrder(data.context, data.buyerUserId, {
      items: [{ productId: data.productId, quantity: 3 }],
    });

    await expectProductStock(data.productId, 7);
    await expectOrderInventoryReserved(order.id, true);

    const items = await db
      .select({
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    expect(items).toEqual([
      {
        productId: data.productId,
        quantity: 3,
        lineTotal: 37.5,
      },
    ]);
  });

  it("adjusts product stock when a new order draft quantity changes", async () => {
    const data = requireTestData();

    const order = await createPortalOrder(data.context, data.buyerUserId, {
      items: [{ productId: data.productId, quantity: 3 }],
    });
    const [item] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    await updateOrderDraft(data.context, order.id, {
      notes: "Increase quantity",
      items: [{ id: item.id, quantity: 5 }],
    });

    await expectProductStock(data.productId, 5);

    await updateOrderDraft(data.context, order.id, {
      notes: "Decrease quantity",
      items: [{ id: item.id, quantity: 2 }],
    });

    await expectProductStock(data.productId, 8);
  });

  it("restores reserved product stock when an order is cancelled", async () => {
    const data = requireTestData();

    const order = await createPortalOrder(data.context, data.buyerUserId, {
      items: [{ productId: data.productId, quantity: 4 }],
    });

    await expectProductStock(data.productId, 6);

    await updateOrderStatus(data.context, order.id, "cancelled");

    await expectProductStock(data.productId, 10);
    await expectOrderInventoryReserved(order.id, false);
  });

  it("rejects draft quantity increases when stock is insufficient", async () => {
    const data = requireTestData();

    const order = await createPortalOrder(data.context, data.buyerUserId, {
      items: [{ productId: data.productId, quantity: 3 }],
    });
    const [item] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    await expect(
      updateOrderDraft(data.context, order.id, {
        items: [{ id: item.id, quantity: 11 }],
      }),
    ).rejects.toThrow("Insufficient stock for Integration Coffee.");

    await expectProductStock(data.productId, 7);
  });
});

async function seedOrderStockTestData(): Promise<TestData> {
  const suffix = randomUUID();
  const companySlug = `stock-test-${suffix}`;
  const buyerUserId = randomUUID();
  const companyUserId = randomUUID();

  profileIds.add(buyerUserId);

  const [company] = await db
    .insert(companies)
    .values({
      name: "Stock Test Wholesale",
      slug: companySlug,
    })
    .returning({ id: companies.id, name: companies.name, slug: companies.slug });

  await db.insert(profiles).values({
    id: buyerUserId,
    email: `buyer-${suffix}@example.com`,
    fullName: "Stock Test Buyer",
  });

  await db.insert(companyUsers).values({
    id: companyUserId,
    companyId: company.id,
    userId: buyerUserId,
    role: "buyer",
  });

  await db.insert(customers).values({
    companyId: company.id,
    name: "Stock Test Customer",
    email: `customer-${suffix}@example.com`,
    portalUserId: buyerUserId,
    isActive: true,
  });

  const [product] = await db
    .insert(products)
    .values({
      companyId: company.id,
      name: "Integration Coffee",
      sku: `INT-COFFEE-${suffix}`,
      unit: "bag",
      price: 12.5,
      stockQuantity: 10,
      lowStockThreshold: 2,
      isActive: true,
    })
    .returning({ id: products.id });

  return {
    companyId: company.id,
    buyerUserId,
    productId: product.id,
    context: {
      userId: buyerUserId,
      company,
      companyUser: {
        id: companyUserId,
        role: "buyer",
      },
    },
  };
}

function requireTestData() {
  if (!testData) {
    throw new Error("Test data was not seeded.");
  }

  return testData;
}

async function expectProductStock(productId: string, expectedStock: number) {
  const [product] = await db
    .select({ stockQuantity: products.stockQuantity })
    .from(products)
    .where(eq(products.id, productId));

  expect(product?.stockQuantity).toBe(expectedStock);
}

async function expectOrderInventoryReserved(
  orderId: string,
  expectedInventoryReserved: boolean,
) {
  const [order] = await db
    .select({ inventoryReserved: orders.inventoryReserved })
    .from(orders)
    .where(eq(orders.id, orderId));

  expect(order?.inventoryReserved).toBe(expectedInventoryReserved);
}
