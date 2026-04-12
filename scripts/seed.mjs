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

async function main() {
  const tableCheck = await sql.unsafe(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('companies', 'customers', 'products')
    order by table_name
  `);

  if (tableCheck.length < 3) {
    throw new Error(
      "Required tables are missing. Run the migrations first with `npm run db:migrate`.",
    );
  }

  const existingCompany = await sql.unsafe(`
    select id, name, slug
    from public.companies
    where slug = 'demo-wholesale'
    limit 1
  `);

  let companyId = existingCompany[0]?.id;

  if (!companyId) {
    const insertedCompany = await sql.unsafe(`
      insert into public.companies (name, slug)
      values ('Demo Wholesale', 'demo-wholesale')
      returning id, name, slug
    `);

    companyId = insertedCompany[0].id;
  }

  await sql.unsafe(`
    insert into public.customers (company_id, name, email, phone)
    values
      ('${companyId}', 'Bakkerij De Markt', 'inkoop@bakkerijdemarkt.be', '+32 11 20 30 40'),
      ('${companyId}', 'Hotel Noordzee', 'purchasing@hotelnoordzee.be', '+32 59 44 12 12'),
      ('${companyId}', 'Brasserie Zuid', 'bestellingen@brasseriezuid.be', '+32 3 555 77 88')
    on conflict do nothing
  `);

  await sql.unsafe(`
    insert into public.products (company_id, name, sku, description, unit, price, is_active)
    values
      ('${companyId}', 'Arabica Koffiebonen 1kg', 'COF-ARAB-1KG', 'Volle arabica blend voor horeca en kantoor.', 'zak', 18.50, true),
      ('${companyId}', 'Haverdrink Barista 1L', 'OAT-BAR-1L', 'Schuimt stabiel voor koffievarianten.', 'doos', 2.95, true),
      ('${companyId}', 'Brownie Mix 2.5kg', 'BRN-MIX-25', 'Gebruiksklare mix voor snelle dessertproductie.', 'emmer', 14.20, true),
      ('${companyId}', 'Suikersticks 1000 stuks', 'SUG-STK-1000', 'Bulkverpakking voor koffiecorners en take-away.', 'karton', 21.00, true),
      ('${companyId}', 'Seizoensconfituur 24x30g', 'JAM-SEAS-24', 'Portieverpakking voor ontbijt en hotelservice.', 'tray', 11.80, false)
    on conflict (company_id, sku)
    do update set
      name = excluded.name,
      description = excluded.description,
      unit = excluded.unit,
      price = excluded.price,
      is_active = excluded.is_active,
      updated_at = now()
  `);

  const orderCount = await sql.unsafe(`
    select count(*)::int as count
    from public.orders
    where company_id = '${companyId}'
  `);

  if ((orderCount[0]?.count ?? 0) === 0) {
    const seededCustomers = await sql.unsafe(`
      select id, name
      from public.customers
      where company_id = '${companyId}'
      order by name asc
      limit 2
    `);

    const seededProducts = await sql.unsafe(`
      select id, name, price
      from public.products
      where company_id = '${companyId}' and is_active = true
      order by sku asc
      limit 3
    `);

    if (seededCustomers.length >= 2 && seededProducts.length >= 3) {
      const firstOrderTotal =
        Number(seededProducts[0].price) * 3 + Number(seededProducts[1].price) * 2;
      const secondOrderTotal = Number(seededProducts[2].price) * 4;

      const insertedOrders = await sql.unsafe(`
        insert into public.orders (company_id, customer_id, status, total_amount, notes)
        values
          ('${companyId}', '${seededCustomers[0].id}', 'new', ${firstOrderTotal.toFixed(2)}, 'Levering graag op woensdagvoormiddag.'),
          ('${companyId}', '${seededCustomers[1].id}', 'confirmed', ${secondOrderTotal.toFixed(2)}, 'Contacteer receptie bij levering.')
        returning id
      `);

      await sql.unsafe(`
        insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price, quantity, line_total)
        values
          ('${insertedOrders[0].id}', '${seededProducts[0].id}', '${seededProducts[0].name}', ${Number(seededProducts[0].price).toFixed(2)}, 3, ${(Number(seededProducts[0].price) * 3).toFixed(2)}),
          ('${insertedOrders[0].id}', '${seededProducts[1].id}', '${seededProducts[1].name}', ${Number(seededProducts[1].price).toFixed(2)}, 2, ${(Number(seededProducts[1].price) * 2).toFixed(2)}),
          ('${insertedOrders[1].id}', '${seededProducts[2].id}', '${seededProducts[2].name}', ${Number(seededProducts[2].price).toFixed(2)}, 4, ${(Number(seededProducts[2].price) * 4).toFixed(2)})
      `);
    }
  }

  const authUsers = await sql.unsafe(`
    select id, email
    from auth.users
    order by created_at asc
    limit 3
  `);

  if (authUsers.length > 0) {
    const ownerUser = authUsers[0];

    await sql.unsafe(`
      insert into public.profiles (id, email, full_name, role)
      values (
        '${ownerUser.id}',
        '${ownerUser.email}',
        'Demo Owner',
        'wholesaler_owner'
      )
      on conflict (id)
      do update set
        email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role
    `);

    await sql.unsafe(`
      insert into public.company_users (company_id, user_id, role)
      values (
        '${companyId}',
        '${ownerUser.id}',
        'wholesaler_owner'
      )
      on conflict (company_id, user_id)
      do update set
        role = excluded.role
    `);

    for (const authUser of authUsers) {
      if (!authUser.email) {
        continue;
      }

      const linkedCustomers = await sql.unsafe(
        `
          update public.customers
          set auth_user_id = $1,
              updated_at = now()
          where company_id = $2
            and lower(email) = lower($3)
          returning id, name, email
        `,
        [authUser.id, companyId, authUser.email],
      );

      if (linkedCustomers.length === 0) {
        continue;
      }

      await sql.unsafe(
        `
          insert into public.profiles (id, email, full_name, role)
          values ($1, $2, $3, 'buyer')
          on conflict (id) do nothing
        `,
        [authUser.id, authUser.email, linkedCustomers[0].name],
      );

      await sql.unsafe(
        `
          insert into public.company_users (company_id, user_id, role)
          values ($1, $2, 'buyer')
          on conflict (company_id, user_id) do nothing
        `,
        [companyId, authUser.id],
      );
    }
  }

  const summary = await sql.unsafe(`
    select
      (select count(*)::int from public.companies where slug = 'demo-wholesale') as companies,
      (select count(*)::int from public.customers where company_id = '${companyId}') as customers,
      (select count(*)::int from public.customers where company_id = '${companyId}' and auth_user_id is not null) as linked_customers,
      (select count(*)::int from public.products where company_id = '${companyId}') as products,
      (select count(*)::int from public.orders where company_id = '${companyId}') as orders,
      (select count(*)::int from public.company_users where company_id = '${companyId}') as company_users
  `);

  console.log(
    JSON.stringify(
      {
        companyId,
        linkedAuthUser: authUsers[0]?.email ?? null,
        ...summary[0],
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
