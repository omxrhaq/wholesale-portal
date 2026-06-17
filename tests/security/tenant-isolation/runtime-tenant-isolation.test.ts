import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CompanyContext } from "@/lib/companies/context";

type DbModule = typeof import("@/lib/db");
type SchemaModule = typeof import("@/lib/db/schema");
type CustomerServiceModule = typeof import("@/lib/services/customer-service");
type ImportServiceModule = typeof import("@/lib/services/import-service");
type OrderServiceModule = typeof import("@/lib/services/order-service");
type ProductServiceModule = typeof import("@/lib/services/product-service");
type RuntimeModules = {
  db: DbModule["db"];
  schema: SchemaModule;
  customerService: CustomerServiceModule;
  importService: ImportServiceModule;
  orderService: OrderServiceModule;
  productService: ProductServiceModule;
};

type TenantFixture = {
  companyA: TenantData;
  companyB: TenantData;
  profileIds: string[];
};

type TenantData = {
  context: CompanyContext;
  companyId: string;
  userId: string;
  customerId: string;
  productId: string;
  orderId: string;
  importId: string;
};

let fixture: TenantFixture | null = null;
let runtimeModules: RuntimeModules | null = null;
const describeRuntimeTenantIsolation = shouldRunRuntimeTenantIsolation()
  ? describe
  : describe.skip;

describeRuntimeTenantIsolation("runtime tenant isolation", () => {
  beforeEach(async () => {
    runtimeModules = await loadRuntimeModules();
    fixture = await seedTenantFixture();
  });

  afterEach(async () => {
    if (!fixture) {
      return;
    }

    const { db, schema } = requireRuntimeModules();

    await db
      .delete(schema.companies)
      .where(eq(schema.companies.id, fixture.companyA.companyId));
    await db
      .delete(schema.companies)
      .where(eq(schema.companies.id, fixture.companyB.companyId));

    for (const profileId of fixture.profileIds) {
      await db.delete(schema.profiles).where(eq(schema.profiles.id, profileId));
    }

    fixture = null;
    runtimeModules = null;
  });

  it("does not return tenant B customers, orders, products or imports through tenant A service boundaries", async () => {
    const { companyA, companyB } = requireFixture();
    const {
      customerService,
      importService,
      orderService,
      productService,
    } = requireRuntimeModules();

    await expect(customerService.listCustomers(companyA.companyId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: companyB.customerId })]),
    );
    await expect(
      customerService.getCustomerById(companyA.companyId, companyB.customerId),
    ).resolves.toBeNull();

    await expect(productService.listProducts(companyA.companyId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: companyB.productId })]),
    );
    await expect(
      productService.getProductById(companyA.companyId, companyB.productId),
    ).resolves.toBeNull();

    await expect(
      orderService.getOrderById(companyA.companyId, companyB.orderId),
    ).resolves.toBeNull();
    await expect(
      orderService.listOrders({ companyId: companyA.companyId }),
    ).resolves.toMatchObject({
      rows: expect.not.arrayContaining([
        expect.objectContaining({ id: companyB.orderId }),
      ]),
    });

    await expect(importService.listImports(companyA.companyId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: companyB.importId })]),
    );
  });

  it("rejects tenant A mutations against tenant B customers, orders and products", async () => {
    const { companyA, companyB } = requireFixture();
    const { customerService, orderService, productService } = requireRuntimeModules();

    await expect(
      customerService.updateCustomer(companyA.context, companyB.customerId, {
        name: "Cross Tenant Customer Update",
        email: "cross-tenant@example.com",
        phone: "",
        isActive: true,
      }),
    ).rejects.toThrow("Customer not found.");

    await expect(
      productService.updateProduct(companyA.context, companyB.productId, {
        name: "Cross Tenant Product Update",
        sku: "CROSS-TENANT-SKU",
        categoryName: "",
        description: "",
        unit: "box",
        price: 9,
        stockQuantity: 9,
        lowStockThreshold: 1,
        isActive: true,
      }),
    ).rejects.toThrow("Product not found.");

    await expect(
      orderService.updateOrderStatus(companyA.context, companyB.orderId, "confirmed"),
    ).rejects.toThrow("Order not found.");
  });

  it("keeps product imports scoped to the acting company even when another tenant has the same SKU", async () => {
    const { companyA, companyB } = requireFixture();
    const { importService, productService } = requireRuntimeModules();
    const beforeTenantBProduct = await productService.getProductById(
      companyB.companyId,
      companyB.productId,
    );

    await importService.importProducts(companyA.context, {
      fileName: "tenant-isolation-products.csv",
      rows: [
        {
          sourceRowNumber: 2,
          name: "Tenant A Imported Product",
          sku: "SHARED-SKU",
          categoryName: "",
          description: "",
          unit: "box",
          price: 15,
          stockQuantity: 6,
          lowStockThreshold: 1,
          isActive: true,
        },
      ],
    });

    await expect(
      productService.getProductById(companyB.companyId, companyB.productId),
    ).resolves.toMatchObject({
      id: companyB.productId,
      name: beforeTenantBProduct?.name,
      price: beforeTenantBProduct?.price,
      stockQuantity: beforeTenantBProduct?.stockQuantity,
    });

    await expect(productService.listProducts(companyA.companyId)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          companyId: companyA.companyId,
          sku: "SHARED-SKU",
          name: "Tenant A Imported Product",
        }),
      ]),
    );
  });
});

async function seedTenantFixture(): Promise<TenantFixture> {
  const suffix = randomUUID();
  const companyA = await seedTenant(`tenant-a-${suffix}`, "Tenant A Wholesale");
  const companyB = await seedTenant(`tenant-b-${suffix}`, "Tenant B Wholesale");

  return {
    companyA,
    companyB,
    profileIds: [companyA.userId, companyB.userId],
  };
}

async function seedTenant(slug: string, name: string): Promise<TenantData> {
  const { db, schema } = requireRuntimeModules();
  const userId = randomUUID();
  const companyUserId = randomUUID();

  const [company] = await db
    .insert(schema.companies)
    .values({ name, slug })
    .returning({
      id: schema.companies.id,
      name: schema.companies.name,
      slug: schema.companies.slug,
    });

  await db.insert(schema.profiles).values({
    id: userId,
    email: `${slug}@example.com`,
    fullName: `${name} Owner`,
  });

  await db.insert(schema.companyUsers).values({
    id: companyUserId,
    companyId: company.id,
    userId,
    role: "wholesaler_owner",
  });

  const [customer] = await db
    .insert(schema.customers)
    .values({
      companyId: company.id,
      name: `${name} Customer`,
      email: `${slug}-customer@example.com`,
      isActive: true,
    })
    .returning({ id: schema.customers.id });

  const [product] = await db
    .insert(schema.products)
    .values({
      companyId: company.id,
      name: `${name} Product`,
      sku: "SHARED-SKU",
      unit: "box",
      price: 12,
      stockQuantity: 4,
      lowStockThreshold: 1,
      isActive: true,
    })
    .returning({ id: schema.products.id });

  const [order] = await db
    .insert(schema.orders)
    .values({
      companyId: company.id,
      customerId: customer.id,
      status: "new",
      totalAmount: 12,
      inventoryReserved: false,
    })
    .returning({ id: schema.orders.id });

  const [importJob] = await db
    .insert(schema.imports)
    .values({
      companyId: company.id,
      fileName: `${slug}.csv`,
      status: "completed",
      totalRows: 1,
      importedRows: 1,
      failedRows: 0,
    })
    .returning({ id: schema.imports.id });

  return {
    companyId: company.id,
    userId,
    customerId: customer.id,
    productId: product.id,
    orderId: order.id,
    importId: importJob.id,
    context: {
      userId,
      company,
      companyUser: {
        id: companyUserId,
        role: "wholesaler_owner",
      },
    },
  };
}

function requireFixture() {
  if (!fixture) {
    throw new Error("Tenant fixture was not seeded.");
  }

  return fixture;
}

async function loadRuntimeModules(): Promise<RuntimeModules> {
  const dbModule = await import("@/lib/db");
  const schema = await import("@/lib/db/schema");
  const customerService = await import("@/lib/services/customer-service");
  const importService = await import("@/lib/services/import-service");
  const orderService = await import("@/lib/services/order-service");
  const productService = await import("@/lib/services/product-service");

  return {
    db: dbModule.db,
    schema,
    customerService,
    importService,
    orderService,
    productService,
  };
}

function requireRuntimeModules() {
  if (!runtimeModules) {
    throw new Error("Runtime modules were not loaded.");
  }

  return runtimeModules;
}

function shouldRunRuntimeTenantIsolation() {
  if (process.env.CI === "true") {
    return true;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return false;
  }

  try {
    const url = new URL(databaseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}
