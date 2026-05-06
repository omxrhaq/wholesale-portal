import { and, asc, desc, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import type { CompanyContext } from "@/lib/companies/context";
import { buildFieldChanges, logActivity } from "@/lib/services/activity-log-service";
import { customerSchema, type CustomerInput } from "@/lib/validation/customer";

export async function listCustomers(companyId: string) {
  return db
    .select()
    .from(customers)
    .where(eq(customers.companyId, companyId))
    .orderBy(desc(customers.isActive), asc(customers.name));
}

export async function getCustomerById(companyId: string, customerId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)))
    .limit(1);

  return customer ?? null;
}

export async function createCustomer(
  context: CompanyContext,
  rawInput: CustomerInput,
) {
  const input = customerSchema.parse(rawInput);

  const [customer] = await db
    .insert(customers)
    .values({
      companyId: context.company.id,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      isActive: input.isActive,
    })
    .returning();

  await logActivity({
    companyId: context.company.id,
    userId: context.userId,
    eventType: "customer.created",
    entityType: "customer",
    entityId: customer.id,
    metadata: {
      email: customer.email,
      changes: [
        { field: "name", before: null, after: customer.name },
        { field: "email", before: null, after: customer.email },
        { field: "phone", before: null, after: customer.phone },
        { field: "isActive", before: null, after: customer.isActive },
      ],
    },
  });

  return customer;
}

export async function updateCustomer(
  context: CompanyContext,
  customerId: string,
  rawInput: CustomerInput,
) {
  const input = customerSchema.parse(rawInput);
  const currentCustomer = await getCustomerById(context.company.id, customerId);

  if (!currentCustomer) {
    throw new Error("Customer not found.");
  }

  const [customer] = await db
    .update(customers)
    .set({
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(and(eq(customers.id, customerId), eq(customers.companyId, context.company.id)))
    .returning();

  await logActivity({
    companyId: context.company.id,
    userId: context.userId,
    eventType: "customer.updated",
    entityType: "customer",
    entityId: customer.id,
    metadata: {
      email: customer.email,
      changes: buildFieldChanges(
        {
          name: currentCustomer.name,
          email: currentCustomer.email,
          phone: currentCustomer.phone,
          isActive: currentCustomer.isActive,
        },
        {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          isActive: customer.isActive,
        },
        [
          { key: "name" },
          { key: "email" },
          { key: "phone" },
          { key: "isActive" },
        ],
      ),
    },
  });

  return customer;
}

export async function setCustomerActive(
  context: CompanyContext,
  customerId: string,
  isActive: boolean,
) {
  const [customer] = await db
    .update(customers)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(and(eq(customers.id, customerId), eq(customers.companyId, context.company.id)))
    .returning();

  if (!customer) {
    throw new Error("Customer not found.");
  }

  await logActivity({
    companyId: context.company.id,
    userId: context.userId,
    eventType: isActive ? "customer.reactivated" : "customer.deactivated",
    entityType: "customer",
    entityId: customer.id,
    metadata: {
      email: customer.email,
      changes: [{ field: "isActive", before: !isActive, after: isActive }],
    },
  });

  return customer;
}

export async function linkCustomerToAuthUser(
  context: CompanyContext,
  customerId: string,
  authUserId: string,
) {
  return db.transaction(async (tx) => {
    await tx
      .update(customers)
      .set({
        authUserId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.companyId, context.company.id),
          eq(customers.authUserId, authUserId),
          ne(customers.id, customerId),
        ),
      );

    const [customer] = await tx
      .update(customers)
      .set({
        authUserId,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, customerId), eq(customers.companyId, context.company.id)))
      .returning();

    if (!customer) {
      throw new Error("Customer not found.");
    }

    return customer;
  });
}
