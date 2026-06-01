import { and, asc, desc, eq, gt, ilike, lt, or, sql } from "drizzle-orm";

import type { SuperAdminContext } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import {
  companies,
  companyUsers,
  customers,
  orders,
  orderItems,
  products,
  profiles,
} from "@/lib/db/schema";
import { logActivityTx } from "@/lib/services/activity-log-service";
import {
  listAdminAuditForCompany,
  logAdminAudit,
  logAdminAuditTx,
} from "@/lib/services/admin-audit-service";
import { sendCustomerPortalSetupEmail } from "@/lib/services/customer-portal-service";
import { buildFieldChanges } from "@/lib/services/activity-log-service";
import { listRecentActivity } from "@/lib/services/activity-log-service";
import { listOrders } from "@/lib/services/order-service";
import { updateProduct } from "@/lib/services/product-service";
import { getProductById } from "@/lib/services/product-service";
import { getCustomerById } from "@/lib/services/customer-service";
import { canTransitionOrderStatus } from "@/lib/orders";
import { customerSchema, type CustomerInput } from "@/lib/validation/customer";
import type { OrderStatus } from "@/lib/db/schema";
import type { ProductInput } from "@/lib/validation/product";

export async function getAdminOverviewStats() {
  const [summary] = await db
    .select({
      companyCount: sql<number>`count(distinct ${companies.id})`.as("company_count"),
      customerCount: sql<number>`(select count(*) from ${customers})`.as("customer_count"),
      productCount: sql<number>`(select count(*) from ${products})`.as("product_count"),
      orderCount: sql<number>`(select count(*) from ${orders})`.as("order_count"),
      staffCount: sql<number>`(
        select count(*)
        from ${companyUsers}
        where ${companyUsers.role} in ('wholesaler_owner', 'wholesaler_staff')
      )`.as("staff_count"),
      buyerCount: sql<number>`(
        select count(*)
        from ${companyUsers}
        where ${companyUsers.role} = 'buyer'
      )`.as("buyer_count"),
    })
    .from(companies);

  return {
    companyCount: Number(summary?.companyCount ?? 0),
    customerCount: Number(summary?.customerCount ?? 0),
    productCount: Number(summary?.productCount ?? 0),
    orderCount: Number(summary?.orderCount ?? 0),
    staffCount: Number(summary?.staffCount ?? 0),
    buyerCount: Number(summary?.buyerCount ?? 0),
  };
}

export async function listAdminCompanies() {
  return db
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      createdAt: companies.createdAt,
      customerCount: sql<number>`(
        select count(*)
        from ${customers}
        where ${customers.companyId} = ${companies.id}
      )`.as("customer_count"),
      productCount: sql<number>`(
        select count(*)
        from ${products}
        where ${products.companyId} = ${companies.id}
      )`.as("product_count"),
      orderCount: sql<number>`(
        select count(*)
        from ${orders}
        where ${orders.companyId} = ${companies.id}
      )`.as("order_count"),
      staffCount: sql<number>`(
        select count(*)
        from ${companyUsers}
        where ${companyUsers.companyId} = ${companies.id}
          and ${companyUsers.role} in ('wholesaler_owner', 'wholesaler_staff')
      )`.as("staff_count"),
      buyerCount: sql<number>`(
        select count(*)
        from ${companyUsers}
        where ${companyUsers.companyId} = ${companies.id}
          and ${companyUsers.role} = 'buyer'
      )`.as("buyer_count"),
    })
    .from(companies)
    .orderBy(asc(companies.name));
}

export async function getAdminCompanyDetail(companyId: string) {
  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      createdAt: companies.createdAt,
      customerCount: sql<number>`(
        select count(*)
        from ${customers}
        where ${customers.companyId} = ${companies.id}
      )`.as("customer_count"),
      activeCustomerCount: sql<number>`(
        select count(*)
        from ${customers}
        where ${customers.companyId} = ${companies.id}
          and ${customers.isActive} is true
      )`.as("active_customer_count"),
      productCount: sql<number>`(
        select count(*)
        from ${products}
        where ${products.companyId} = ${companies.id}
      )`.as("product_count"),
      activeProductCount: sql<number>`(
        select count(*)
        from ${products}
        where ${products.companyId} = ${companies.id}
          and ${products.isActive} is true
      )`.as("active_product_count"),
      orderCount: sql<number>`(
        select count(*)
        from ${orders}
        where ${orders.companyId} = ${companies.id}
      )`.as("order_count"),
      openOrderCount: sql<number>`(
        select count(*)
        from ${orders}
        where ${orders.companyId} = ${companies.id}
          and ${orders.status} in ('new', 'confirmed', 'processing')
      )`.as("open_order_count"),
      staffCount: sql<number>`(
        select count(*)
        from ${companyUsers}
        where ${companyUsers.companyId} = ${companies.id}
          and ${companyUsers.role} in ('wholesaler_owner', 'wholesaler_staff')
      )`.as("staff_count"),
      buyerCount: sql<number>`(
        select count(*)
        from ${companyUsers}
        where ${companyUsers.companyId} = ${companies.id}
          and ${companyUsers.role} = 'buyer'
      )`.as("buyer_count"),
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  return company ?? null;
}

export async function getAdminCompanyWorkspace(companyId: string) {
  const company = await getAdminCompanyDetail(companyId);

  if (!company) {
    return null;
  }

  const [members, recentOrders, recentTenantActivity, recentAdminActivity] =
    await Promise.all([
      listAdminCompanyMembers(companyId, 8),
      listOrders({ companyId, pageSize: 5, sort: "created_desc" }),
      listRecentActivity(companyId, 8),
      listAdminAuditForCompany(companyId, 8),
    ]);

  return {
    company,
    members,
    recentOrders: recentOrders.rows,
    recentTenantActivity,
    recentAdminActivity,
  };
}

export async function listAdminCompanyMembers(companyId: string, limit?: number) {
  const query = db
    .select({
      id: companyUsers.id,
      userId: companyUsers.userId,
      role: companyUsers.role,
      createdAt: companyUsers.createdAt,
      email: profiles.email,
      fullName: profiles.fullName,
    })
    .from(companyUsers)
    .leftJoin(profiles, eq(companyUsers.userId, profiles.id))
    .where(eq(companyUsers.companyId, companyId))
    .orderBy(asc(companyUsers.role), asc(profiles.fullName), asc(profiles.email));

  return limit ? query.limit(limit) : query;
}

type AdminListInput = {
  companyId: string;
  query?: string;
  cursor?: string;
  direction?: "next" | "prev";
  pageSize?: number;
};

export async function listAdminCustomers({
  companyId,
  query = "",
  cursor,
  direction = "next",
  pageSize = 25,
}: AdminListInput) {
  const search = query.trim();
  const filters = [eq(customers.companyId, companyId)];

  if (search) {
    const pattern = `%${search}%`;
    filters.push(or(ilike(customers.name, pattern), ilike(customers.email, pattern), ilike(customers.phone, pattern))!);
  }

  const summaryWhere = and(...filters);
  const decodedCursor = decodeCursor<{ name: string; id: string }>(cursor);
  if (decodedCursor && typeof decodedCursor.name === "string" && typeof decodedCursor.id === "string") {
    filters.push(
      direction === "prev"
        ? or(lt(customers.name, decodedCursor.name), and(eq(customers.name, decodedCursor.name), lt(customers.id, decodedCursor.id)))!
        : or(gt(customers.name, decodedCursor.name), and(eq(customers.name, decodedCursor.name), gt(customers.id, decodedCursor.id)))!,
    );
  }

  const where = and(...filters);
  const [summary, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(customers).where(summaryWhere),
    db.select().from(customers).where(where).orderBy(
      direction === "prev" ? desc(customers.name) : asc(customers.name),
      direction === "prev" ? desc(customers.id) : asc(customers.id),
    ).limit(pageSize + 1),
  ]);

  return toCursorPage(direction === "prev" ? rows.reverse() : rows, Number(summary[0]?.count ?? 0), pageSize, (row) => ({ name: row.name, id: row.id }), Boolean(cursor), direction);
}

export async function listAdminProducts({
  companyId,
  query = "",
  cursor,
  direction = "next",
  pageSize = 25,
}: AdminListInput) {
  const search = query.trim();
  const filters = [eq(products.companyId, companyId)];

  if (search) {
    const pattern = `%${search}%`;
    filters.push(or(ilike(products.name, pattern), ilike(products.sku, pattern))!);
  }

  const summaryWhere = and(...filters);
  const decodedCursor = decodeCursor<{ updatedAt: string; id: string }>(cursor);
  if (decodedCursor && typeof decodedCursor.updatedAt === "string" && typeof decodedCursor.id === "string") {
    const updatedAt = parseCursorDate(decodedCursor.updatedAt);
    if (!updatedAt) return listAdminProducts({ companyId, query, pageSize });
    filters.push(
      direction === "prev"
        ? or(gt(products.updatedAt, updatedAt), and(eq(products.updatedAt, updatedAt), gt(products.id, decodedCursor.id)))!
        : or(lt(products.updatedAt, updatedAt), and(eq(products.updatedAt, updatedAt), lt(products.id, decodedCursor.id)))!,
    );
  }

  const where = and(...filters);
  const [summary, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(products).where(summaryWhere),
    db.select().from(products).where(where).orderBy(
      direction === "prev" ? asc(products.updatedAt) : desc(products.updatedAt),
      direction === "prev" ? asc(products.id) : desc(products.id),
    ).limit(pageSize + 1),
  ]);

  return toCursorPage(direction === "prev" ? rows.reverse() : rows, Number(summary[0]?.count ?? 0), pageSize, (row) => ({ updatedAt: row.updatedAt.toISOString(), id: row.id }), Boolean(cursor), direction);
}

export async function listAdminOrders({
  companyId,
  query = "",
  cursor,
  direction = "next",
  pageSize = 25,
}: AdminListInput) {
  const search = query.trim();
  const filters = [eq(orders.companyId, companyId)];

  if (search) {
    const pattern = `%${search}%`;
    filters.push(or(ilike(customers.name, pattern), ilike(customers.email, pattern), sql`cast(${orders.id} as text) ilike ${pattern}`)!);
  }

  const summaryWhere = and(...filters);
  const decodedCursor = decodeCursor<{ createdAt: string; id: string }>(cursor);
  if (decodedCursor && typeof decodedCursor.createdAt === "string" && typeof decodedCursor.id === "string") {
    const createdAt = parseCursorDate(decodedCursor.createdAt);
    if (!createdAt) return listAdminOrders({ companyId, query, pageSize });
    filters.push(
      direction === "prev"
        ? or(gt(orders.createdAt, createdAt), and(eq(orders.createdAt, createdAt), gt(orders.id, decodedCursor.id)))!
        : or(lt(orders.createdAt, createdAt), and(eq(orders.createdAt, createdAt), lt(orders.id, decodedCursor.id)))!,
    );
  }

  const where = and(...filters);
  const [summary, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(summaryWhere),
    db.select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      customerName: customers.name,
      itemCount: sql<number>`(select count(*) from ${orderItems} where ${orderItems.orderId} = ${orders.id})`.as("item_count"),
    }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(where).orderBy(
      direction === "prev" ? asc(orders.createdAt) : desc(orders.createdAt),
      direction === "prev" ? asc(orders.id) : desc(orders.id),
    ).limit(pageSize + 1),
  ]);

  return toCursorPage(direction === "prev" ? rows.reverse() : rows, Number(summary[0]?.count ?? 0), pageSize, (row) => ({ createdAt: row.createdAt.toISOString(), id: row.id }), Boolean(cursor), direction);
}

export async function getAdminCustomer(companyId: string, customerId: string) {
  return getCustomerById(companyId, customerId);
}

export async function getAdminProduct(companyId: string, productId: string) {
  return getProductById(companyId, productId);
}

function toCursorPage<TRow, TCursor>(
  rows: TRow[],
  totalCount: number,
  pageSize: number,
  getCursor: (row: TRow) => TCursor,
  hasCursor: boolean,
  direction: "next" | "prev",
) {
  const pageRows = rows.slice(0, pageSize);
  return {
    rows: pageRows,
    totalCount,
    pageSize,
    previousCursor: (directionHasPrevious(direction, rows, pageSize, hasCursor) && pageRows[0]) ? encodeCursor(getCursor(pageRows[0])) : null,
    nextCursor: (directionHasNext(direction, rows, pageSize, hasCursor) && pageRows.at(-1)) ? encodeCursor(getCursor(pageRows.at(-1)!)) : null,
  };
}

function directionHasPrevious(direction: "next" | "prev", rows: unknown[], pageSize: number, hasCursor: boolean) {
  return direction === "prev" ? rows.length > pageSize : hasCursor;
}

function directionHasNext(direction: "next" | "prev", rows: unknown[], pageSize: number, hasCursor: boolean) {
  return direction === "prev" ? hasCursor : rows.length > pageSize;
}

function encodeCursor(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeCursor<T>(cursor?: string) {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function parseCursorDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function setCustomerActiveAsSuperAdmin(
  admin: SuperAdminContext,
  companyId: string,
  customerId: string,
  isActive: boolean,
) {
  const [customer] = await db
    .select({
      id: customers.id,
      companyId: customers.companyId,
      name: customers.name,
      email: customers.email,
      isActive: customers.isActive,
    })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)))
    .limit(1);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  return db.transaction(async (tx) => {
    const [updatedCustomer] = await tx
      .update(customers)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)))
      .returning();

    if (!updatedCustomer) {
      throw new Error("Customer not found.");
    }

    await logActivityTx(tx, {
      companyId: customer.companyId,
      userId: admin.userId,
      eventType: isActive ? "customer.reactivated" : "customer.deactivated",
      entityId: customer.id,
      metadata: {
        email: customer.email,
        changes: [{ field: "isActive", before: customer.isActive, after: isActive }],
      },
    });

    await logAdminAuditTx(tx, {
      adminUserId: admin.userId,
      actionType: isActive
        ? "admin.customer.reactivated"
        : "admin.customer.deactivated",
      targetId: customer.id,
      companyId: customer.companyId,
      metadata: {
        customerName: customer.name,
        customerEmail: customer.email,
      },
    });

    return updatedCustomer;
  });
}

export async function sendCustomerPortalSetupEmailAsSuperAdmin(
  admin: SuperAdminContext,
  companyId: string,
  customerId: string,
) {
  const [customer] = await db
    .select({
      id: customers.id,
      companyId: customers.companyId,
      name: customers.name,
      email: customers.email,
    })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)))
    .limit(1);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  await sendCustomerPortalSetupEmail({
    actorUserId: admin.userId,
    companyId: customer.companyId,
    customerId: customer.id,
  });

  await logAdminAudit({
    adminUserId: admin.userId,
    actionType: "admin.customer.portal_setup_email_sent",
    targetId: customer.id,
    companyId: customer.companyId,
    metadata: {
      customerName: customer.name,
      customerEmail: customer.email ?? "",
    },
  });

  return customer;
}

export async function updateCustomerAsSuperAdmin(
  admin: SuperAdminContext,
  companyId: string,
  customerId: string,
  rawInput: CustomerInput,
) {
  const input = customerSchema.parse(rawInput);
  const [currentCustomer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)))
    .limit(1);

  if (!currentCustomer) {
    throw new Error("Customer not found.");
  }

  return db.transaction(async (tx) => {
    const [customer] = await tx
      .update(customers)
      .set({
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)))
      .returning();

    if (!customer) {
      throw new Error("Customer not found.");
    }

    const changes = buildFieldChanges(
      currentCustomer,
      customer,
      [{ key: "name" }, { key: "email" }, { key: "phone" }, { key: "isActive" }],
    );

    await logActivityTx(tx, {
      companyId,
      userId: admin.userId,
      eventType: "customer.updated",
      entityId: customer.id,
      metadata: { email: customer.email, changes },
    });
    await logAdminAuditTx(tx, {
      adminUserId: admin.userId,
      actionType: "admin.customer.updated",
      targetId: customer.id,
      companyId,
      metadata: { customerName: customer.name, customerEmail: customer.email },
    });

    return customer;
  });
}

export async function setProductActiveAsSuperAdmin(
  admin: SuperAdminContext,
  companyId: string,
  productId: string,
  isActive: boolean,
) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .update(products)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
      .returning();

    if (!product) {
      throw new Error("Product not found.");
    }

    await logActivityTx(tx, {
      companyId,
      userId: admin.userId,
      eventType: isActive ? "product.reactivated" : "product.deactivated",
      entityId: product.id,
      metadata: {
        sku: product.sku,
        changes: [{ field: "isActive", before: !isActive, after: isActive }],
      },
    });
    await logAdminAuditTx(tx, {
      adminUserId: admin.userId,
      actionType: isActive ? "admin.product.reactivated" : "admin.product.deactivated",
      targetId: product.id,
      companyId,
      metadata: { productName: product.name, sku: product.sku },
    });

    return product;
  });
}

export async function updateProductAsSuperAdmin(
  admin: SuperAdminContext,
  companyId: string,
  productId: string,
  input: ProductInput,
) {
  const product = await updateProduct(
    {
      userId: admin.userId,
      company: { id: companyId, name: "", slug: "" },
      companyUser: { id: admin.userId, role: "wholesaler_owner" },
    },
    productId,
    input,
  );

  await logAdminAudit({
    adminUserId: admin.userId,
    actionType: "admin.product.updated",
    targetId: product.id,
    companyId,
    metadata: { productName: product.name, sku: product.sku },
  });

  return product;
}

export async function updateOrderStatusAsSuperAdmin(
  admin: SuperAdminContext,
  companyId: string,
  orderId: string,
  nextStatus: OrderStatus,
) {
  const [currentOrder] = await db
    .select({
      id: orders.id,
      status: orders.status,
      customerName: customers.name,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(eq(orders.id, orderId), eq(orders.companyId, companyId)))
    .limit(1);

  if (!currentOrder) {
    throw new Error("Order not found.");
  }

  if (currentOrder.status === nextStatus) {
    return currentOrder;
  }

  if (!canTransitionOrderStatus(currentOrder.status, nextStatus)) {
    throw new Error(`Invalid status transition: ${currentOrder.status} -> ${nextStatus}.`);
  }

  return db.transaction(async (tx) => {
    const [order] = await tx
      .update(orders)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.companyId, companyId),
          eq(orders.status, currentOrder.status),
        ),
      )
      .returning();

    if (!order) {
      throw new Error("Order status changed before this update. Refresh and try again.");
    }

    await logActivityTx(tx, {
      companyId,
      userId: admin.userId,
      eventType: "order.status_changed",
      entityId: order.id,
      metadata: {
        previousStatus: currentOrder.status,
        nextStatus,
        actorRole: "super_admin",
      },
    });
    await logAdminAuditTx(tx, {
      adminUserId: admin.userId,
      actionType: "admin.order.status_changed",
      targetId: order.id,
      companyId,
      metadata: {
        customerName: currentOrder.customerName,
        previousStatus: currentOrder.status,
        nextStatus,
      },
    });

    return order;
  });
}
