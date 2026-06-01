import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  throw new Error("Usage: node scripts/grant-super-admin.mjs <email>");
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  prepare: false,
});

async function main() {
  const [user] = await sql.unsafe(
    `
      select
        id,
        email,
        coalesce(nullif(trim(raw_user_meta_data->>'full_name'), ''), email) as full_name
      from auth.users
      where lower(email) = lower($1)
      limit 1
    `,
    [email],
  );

  if (!user) {
    throw new Error(`No auth user found for ${email}.`);
  }

  await sql.unsafe(
    `
      insert into public.profiles (id, email, full_name)
      values ($1, $2, $3)
      on conflict (id) do update
      set
        email = excluded.email,
        full_name = excluded.full_name
    `,
    [user.id, user.email, user.full_name],
  );

  await sql.unsafe(
    `
      insert into public.super_admins (user_id)
      values ($1)
      on conflict (user_id) do nothing
    `,
    [user.id],
  );

  console.log(
    JSON.stringify(
      {
        granted: true,
        userId: user.id,
        email: user.email,
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
