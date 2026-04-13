import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", [
  "wholesaler_owner",
  "wholesaler_staff",
  "buyer",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "new",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
]);

export const importStatusEnum = pgEnum("import_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    pgPolicy("profiles_select_own", {
      for: "select",
      to: "authenticated",
      using: sql`${table.id} = (select auth.uid())`,
    }),
  ],
).enableRLS();

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("companies_slug_idx").on(table.slug),
    pgPolicy("companies_select_members", {
      for: "select",
      to: "authenticated",
      using: sql`exists (
        select 1
        from company_users cu
        where cu.company_id = ${table.id}
          and cu.user_id = (select auth.uid())
          and (
            cu.role in ('wholesaler_owner', 'wholesaler_staff')
            or exists (
              select 1
              from customers c
              where c.company_id = ${table.id}
                and c.auth_user_id = (select auth.uid())
                and c.is_active is true
            )
          )
      )`,
    }),
  ],
).enableRLS();

export const companyUsers = pgTable(
  "company_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: appRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("company_users_company_user_idx").on(table.companyId, table.userId),
    index("company_users_user_idx").on(table.userId),
    pgPolicy("company_users_select_own", {
      for: "select",
      to: "authenticated",
      using: sql`${table.userId} = (select auth.uid())`,
    }),
  ],
).enableRLS();

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    authUserId: uuid("auth_user_id"),
    phone: varchar("phone", { length: 50 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("customers_company_idx").on(table.companyId),
    index("customers_company_active_idx").on(table.companyId, table.isActive),
    index("customers_auth_user_idx").on(table.authUserId),
    uniqueIndex("customers_company_auth_user_idx").on(table.companyId, table.authUserId),
    pgPolicy("customers_select_company_staff_or_own_buyer", {
      for: "select",
      to: "authenticated",
      using: sql`exists (
        select 1
        from company_users cu
        where cu.company_id = ${table.companyId}
          and cu.user_id = (select auth.uid())
          and cu.role in ('wholesaler_owner', 'wholesaler_staff')
      )
      or (
        ${table.authUserId} = (select auth.uid())
        and ${table.isActive} is true
      )`,
    }),
  ],
).enableRLS();

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("product_categories_company_normalized_idx").on(
      table.companyId,
      table.normalizedName,
    ),
    index("product_categories_company_name_idx").on(table.companyId, table.name),
    pgPolicy("product_categories_select_company_members", {
      for: "select",
      to: "authenticated",
      using: sql`exists (
        select 1
        from company_users cu
        where cu.company_id = ${table.companyId}
          and cu.user_id = (select auth.uid())
          and (
            cu.role in ('wholesaler_owner', 'wholesaler_staff')
            or (
              cu.role = 'buyer'
              and exists (
                select 1
                from customers c
                where c.company_id = ${table.companyId}
                  and c.auth_user_id = (select auth.uid())
                  and c.is_active is true
              )
            )
          )
      )`,
    }),
  ],
).enableRLS();

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => productCategories.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 120 }).notNull(),
    description: text("description"),
    unit: varchar("unit", { length: 50 }).notNull(),
    price: numeric("price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("products_company_sku_idx").on(table.companyId, table.sku),
    index("products_company_active_idx").on(table.companyId, table.isActive),
    pgPolicy("products_select_company_members", {
      for: "select",
      to: "authenticated",
      using: sql`exists (
        select 1
        from company_users cu
        where cu.company_id = ${table.companyId}
          and cu.user_id = (select auth.uid())
          and (
            cu.role in ('wholesaler_owner', 'wholesaler_staff')
            or (
              cu.role = 'buyer'
              and ${table.isActive} is true
              and exists (
                select 1
                from customers c
                where c.company_id = ${table.companyId}
                  and c.auth_user_id = (select auth.uid())
                  and c.is_active is true
              )
            )
          )
      )`,
    }),
  ],
).enableRLS();

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").default("new").notNull(),
    totalAmount: numeric("total_amount", {
      precision: 12,
      scale: 2,
      mode: "number",
    }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("orders_company_idx").on(table.companyId),
    index("orders_customer_idx").on(table.customerId),
    pgPolicy("orders_select_company_staff_or_own_buyer", {
      for: "select",
      to: "authenticated",
      using: sql`exists (
        select 1
        from company_users cu
        where cu.company_id = ${table.companyId}
          and cu.user_id = (select auth.uid())
          and cu.role in ('wholesaler_owner', 'wholesaler_staff')
      )
      or exists (
        select 1
        from customers c
        where c.id = ${table.customerId}
          and c.company_id = ${table.companyId}
          and c.auth_user_id = (select auth.uid())
          and c.is_active is true
      )`,
    }),
  ],
).enableRLS();

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productNameSnapshot: varchar("product_name_snapshot", { length: 255 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    pgPolicy("order_items_select_visible_orders", {
      for: "select",
      to: "authenticated",
      using: sql`exists (
        select 1
        from orders o
        inner join customers c on c.id = o.customer_id
        where o.id = ${table.orderId}
          and (
            exists (
              select 1
              from company_users cu
              where cu.company_id = o.company_id
                and cu.user_id = (select auth.uid())
                and cu.role in ('wholesaler_owner', 'wholesaler_staff')
            )
            or (
              c.auth_user_id = (select auth.uid())
              and c.is_active is true
            )
          )
      )`,
    }),
  ],
).enableRLS();

export const imports = pgTable(
  "imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    status: importStatusEnum("status").default("pending").notNull(),
    totalRows: integer("total_rows").default(0).notNull(),
    importedRows: integer("imported_rows").default(0).notNull(),
    failedRows: integer("failed_rows").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("imports_company_idx").on(table.companyId),
    pgPolicy("imports_select_company_staff", {
      for: "select",
      to: "authenticated",
      using: sql`exists (
        select 1
        from company_users cu
        where cu.company_id = ${table.companyId}
          and cu.user_id = (select auth.uid())
          and cu.role in ('wholesaler_owner', 'wholesaler_staff')
      )`,
    }),
  ],
).enableRLS();

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activity_logs_company_idx").on(table.companyId),
    pgPolicy("activity_logs_select_company_staff", {
      for: "select",
      to: "authenticated",
      using: sql`exists (
        select 1
        from company_users cu
        where cu.company_id = ${table.companyId}
          and cu.user_id = (select auth.uid())
          and cu.role in ('wholesaler_owner', 'wholesaler_staff')
      )`,
    }),
  ],
).enableRLS();

export type AppRole = (typeof appRoleEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type ImportStatus = (typeof importStatusEnum.enumValues)[number];
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
