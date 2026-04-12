ALTER TABLE "customers" ADD COLUMN "auth_user_id" uuid;--> statement-breakpoint
WITH matched_customers AS (
  SELECT
    c.id AS customer_id,
    au.id AS auth_user_id,
    row_number() OVER (
      PARTITION BY c.company_id, au.id
      ORDER BY c.is_active DESC, c.created_at ASC
    ) AS match_rank
  FROM "customers" c
  INNER JOIN auth.users au ON lower(c.email) = lower(au.email)
  INNER JOIN "company_users" cu
    ON cu.company_id = c.company_id
    AND cu.user_id = au.id
  WHERE c.email IS NOT NULL
)
UPDATE "customers" c
SET
  auth_user_id = matched_customers.auth_user_id,
  updated_at = now()
FROM matched_customers
WHERE c.id = matched_customers.customer_id
  AND matched_customers.match_rank = 1;--> statement-breakpoint
CREATE INDEX "customers_auth_user_idx" ON "customers" USING btree ("auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_company_auth_user_idx" ON "customers" USING btree ("company_id","auth_user_id");
