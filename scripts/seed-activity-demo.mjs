import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  prepare: false,
});

const SEED_TAG = "trail-management-bulk-demo";

async function main() {
  const company = (
    await sql`
      select id, name
      from public.companies
      where slug = 'demo-wholesale'
      limit 1
    `
  )[0];

  if (!company) {
    throw new Error("Demo Wholesale company not found. Run `npm run db:seed` first.");
  }

  const staffUsers = await sql`
    select
      cu.user_id,
      cu.role,
      p.full_name,
      p.email
    from public.company_users cu
    left join public.profiles p on p.id = cu.user_id
    where cu.company_id = ${company.id}
      and cu.role in ('wholesaler_owner', 'wholesaler_staff')
    order by cu.created_at asc
  `;

  if (staffUsers.length === 0) {
    throw new Error("No wholesaler staff users found for demo company.");
  }

  const customers = await sql`
    select id, name, email, phone, is_active, updated_at
    from public.customers
    where company_id = ${company.id}
    order by created_at asc
  `;

  const categories = await sql`
    select id, name, updated_at
    from public.product_categories
    where company_id = ${company.id}
    order by created_at asc
  `;

  const products = await sql`
    select
      p.id,
      p.name,
      p.sku,
      p.description,
      p.unit,
      p.price,
      p.is_active,
      p.updated_at,
      coalesce(pc.name, '') as category_name
    from public.products p
    left join public.product_categories pc on pc.id = p.category_id
    where p.company_id = ${company.id}
    order by p.created_at asc
  `;

  const orders = await sql`
    select id, status, total_amount, notes, updated_at, created_at
    from public.orders
    where company_id = ${company.id}
    order by created_at asc
  `;

  const orderItems = await sql`
    select
      oi.id,
      oi.order_id,
      oi.product_name_snapshot,
      oi.quantity,
      oi.unit_price,
      oi.line_total
    from public.order_items oi
    inner join public.orders o on o.id = oi.order_id
    where o.company_id = ${company.id}
    order by oi.order_id asc, oi.created_at asc
  `;

  const orderItemsByOrderId = new Map();
  for (const item of orderItems) {
    const current = orderItemsByOrderId.get(item.order_id) ?? [];
    current.push(item);
    orderItemsByOrderId.set(item.order_id, current);
  }

  const rows = [];
  const latestByEntity = new Map();
  const now = new Date();
  let minuteCursor = 60 * 24 * 40;
  let actorIndex = 0;

  function nextActor() {
    const actor = staffUsers[actorIndex % staffUsers.length];
    actorIndex += 1;
    return actor;
  }

  function nextTimestamp(step = 90) {
    const createdAt = new Date(now.getTime() - minuteCursor * 60_000);
    minuteCursor -= step;
    return createdAt;
  }

  function registerEntityTimestamp(entityType, entityId, createdAt) {
    const key = `${entityType}:${entityId}`;
    const current = latestByEntity.get(key);

    if (!current || current < createdAt) {
      latestByEntity.set(key, createdAt);
    }
  }

  function pushActivity({
    eventType,
    entityType,
    entityId,
    metadata = null,
    step,
  }) {
    const actor = nextActor();
    const createdAt = nextTimestamp(step);
    const payload = metadata
      ? {
          ...metadata,
          seedTag: SEED_TAG,
        }
      : { seedTag: SEED_TAG };

    rows.push({
      companyId: company.id,
      userId: actor.user_id,
      eventType,
      entityType,
      entityId,
      metadata: payload,
      createdAt,
    });
    registerEntityTimestamp(entityType, entityId, createdAt);
  }

  for (const customer of customers) {
    pushActivity({
      eventType: "customer.created",
      entityType: "customer",
      entityId: customer.id,
      metadata: {
        changes: [
          { field: "name", before: null, after: customer.name },
          { field: "email", before: null, after: customer.email ?? null },
          { field: "phone", before: null, after: customer.phone ?? null },
          { field: "isActive", before: null, after: customer.is_active },
        ],
        email: customer.email ?? null,
      },
      step: 220,
    });

    for (let index = 0; index < 5; index += 1) {
      pushActivity({
        eventType: "customer.updated",
        entityType: "customer",
        entityId: customer.id,
        metadata: {
          changes: [
            {
              field: "phone",
              before: `+32 ${index + 2}${index + 1} ${index + 3}${index + 4} ${index + 5}${index + 6} ${index + 7}${index + 8}`,
              after: customer.phone ?? `+32 10 20 30 4${index}`,
            },
            {
              field: "name",
              before: `${customer.name} ${index + 1}`,
              after: customer.name,
            },
          ],
          email: customer.email ?? null,
        },
        step: 150,
      });
    }

    if (customer.email) {
      pushActivity({
        eventType: "customer.portal_setup_email_sent",
        entityType: "customer",
        entityId: customer.id,
        metadata: {
          email: customer.email,
        },
        step: 120,
      });

      pushActivity({
        eventType: "customer.portal_setup_link_generated",
        entityType: "customer",
        entityId: customer.id,
        metadata: {
          email: customer.email,
        },
        step: 90,
      });
    }
  }

  for (const category of categories) {
    const historicalNames = [
      `${category.name} Essentials`,
      `${category.name} Core`,
      category.name,
    ];

    for (let index = 0; index < historicalNames.length - 1; index += 1) {
      pushActivity({
        eventType: index === 0 ? "product_category.created" : "product_category.updated",
        entityType: "product_category",
        entityId: category.id,
        metadata: {
          changes: [
            {
              field: "name",
              before: index === 0 ? null : historicalNames[index],
              after: historicalNames[index + 1],
            },
          ],
        },
        step: 160,
      });
    }

    for (let index = 0; index < 2; index += 1) {
      pushActivity({
        eventType: "product_category.updated",
        entityType: "product_category",
        entityId: category.id,
        metadata: {
          changes: [
            {
              field: "name",
              before: `${category.name} ${index + 1}`,
              after: category.name,
            },
          ],
        },
        step: 95,
      });
    }
  }

  for (const product of products) {
    pushActivity({
      eventType: "product.created",
      entityType: "product",
      entityId: product.id,
      metadata: {
        changes: [
          { field: "name", before: null, after: product.name },
          { field: "sku", before: null, after: product.sku },
          { field: "categoryName", before: null, after: product.category_name || null },
          { field: "description", before: null, after: product.description ?? null },
          { field: "unit", before: null, after: product.unit },
          { field: "price", before: null, after: Number(product.price) },
          { field: "isActive", before: null, after: product.is_active },
        ],
      },
      step: 150,
    });

    for (let index = 0; index < 6; index += 1) {
      const historicalPrice = Number(product.price) + (index % 2 === 0 ? 0.8 : -0.5);
      pushActivity({
        eventType: "product.updated",
        entityType: "product",
        entityId: product.id,
        metadata: {
          changes: [
            {
              field: "price",
              before: Number(historicalPrice.toFixed(2)),
              after: Number(product.price),
            },
            {
              field: "description",
              before: `${product.name} batch ${index + 1}`,
              after: product.description ?? `${product.name} standard description`,
            },
          ],
        },
        step: 110,
      });
    }

    if (!product.is_active) {
      pushActivity({
        eventType: "product.deactivated",
        entityType: "product",
        entityId: product.id,
        metadata: {
          changes: [
            { field: "isActive", before: true, after: false },
          ],
        },
        step: 80,
      });
    }
  }

  for (const order of orders) {
    const items = orderItemsByOrderId.get(order.id) ?? [];

    pushActivity({
      eventType: "order.created",
      entityType: "order",
      entityId: order.id,
      metadata: {
        seedTag: SEED_TAG,
      },
      step: 170,
    });

    const totalAmount = Number(order.total_amount);
    const currentNotes = order.notes ?? "";

    for (let index = 0; index < 10; index += 1) {
      const primaryItem = items[index % items.length];
      const secondaryItem = items.length > 1 ? items[(index + 1) % items.length] : null;
      const itemChanges = primaryItem
        ? [
            {
              productName: primaryItem.product_name_snapshot,
              beforeQuantity: Math.max(1, Number(primaryItem.quantity) + ((index % 3) - 1)),
              afterQuantity: Number(primaryItem.quantity),
            },
            ...(secondaryItem
              ? [
                  {
                    productName: secondaryItem.product_name_snapshot,
                    beforeQuantity: Math.max(1, Number(secondaryItem.quantity) + (index % 2 === 0 ? 1 : -1)),
                    afterQuantity: Number(secondaryItem.quantity),
                  },
                ]
              : []),
          ]
        : [];

      pushActivity({
        eventType: "order.updated",
        entityType: "order",
        entityId: order.id,
        metadata: {
          changes: [
            {
              field: "notes",
              before: currentNotes
                ? `${currentNotes} rev ${index + 1}`
                : `Interne notitie ${index + 1}`,
              after: currentNotes || "Geen notities",
            },
            {
              field: "totalAmount",
              before: Number((totalAmount + (index % 2 === 0 ? 3.5 : -2.25)).toFixed(2)),
              after: totalAmount,
            },
          ],
          itemChanges,
          removedItems:
            index % 4 === 0 && items[0]
              ? [{ productName: items[0].product_name_snapshot }]
              : [],
        },
        step: 70,
      });
    }

    if (order.status === "confirmed") {
      pushActivity({
        eventType: "order.status_changed",
        entityType: "order",
        entityId: order.id,
        metadata: {
          previousStatus: "new",
          nextStatus: "confirmed",
        },
        step: 50,
      });
    }
  }

  await sql.begin(async (tx) => {
    await tx`
      delete from public.activity_logs
      where company_id = ${company.id}
        and metadata ->> 'seedTag' = ${SEED_TAG}
    `;

    for (const row of rows) {
      await tx`
        insert into public.activity_logs (
          company_id,
          user_id,
          event_type,
          entity_type,
          entity_id,
          metadata,
          created_at
        ) values (
          ${row.companyId},
          ${row.userId},
          ${row.eventType},
          ${row.entityType},
          ${row.entityId},
          ${row.metadata},
          ${row.createdAt.toISOString()}
        )
      `;
    }

    for (const customer of customers) {
      const latest = latestByEntity.get(`customer:${customer.id}`);
      if (latest) {
        await tx`
          update public.customers
          set updated_at = ${latest.toISOString()}
          where id = ${customer.id}
        `;
      }
    }

    for (const product of products) {
      const latest = latestByEntity.get(`product:${product.id}`);
      if (latest) {
        await tx`
          update public.products
          set updated_at = ${latest.toISOString()}
          where id = ${product.id}
        `;
      }
    }

    for (const category of categories) {
      const latest = latestByEntity.get(`product_category:${category.id}`);
      if (latest) {
        await tx`
          update public.product_categories
          set updated_at = ${latest.toISOString()}
          where id = ${category.id}
        `;
      }
    }

    for (const order of orders) {
      const latest = latestByEntity.get(`order:${order.id}`);
      if (latest) {
        await tx`
          update public.orders
          set updated_at = ${latest.toISOString()}
          where id = ${order.id}
        `;
      }
    }
  });

  const insertedSummary = await sql`
    select entity_type, count(*)::int as count
    from public.activity_logs
    where company_id = ${company.id}
      and metadata ->> 'seedTag' = ${SEED_TAG}
    group by entity_type
    order by entity_type asc
  `;

  console.log(
    JSON.stringify(
      {
        companyId: company.id,
        seedTag: SEED_TAG,
        insertedLogs: rows.length,
        byEntityType: insertedSummary,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} finally {
  await sql.end();
}
