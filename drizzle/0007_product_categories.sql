CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"normalized_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_company_normalized_idx" ON "product_categories" USING btree ("company_id","normalized_name");--> statement-breakpoint
CREATE INDEX "product_categories_company_name_idx" ON "product_categories" USING btree ("company_id","name");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "product_categories_select_company_members" ON "product_categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from company_users cu
        where cu.company_id = "product_categories"."company_id"
          and cu.user_id = (select auth.uid())
          and (
            cu.role in ('wholesaler_owner', 'wholesaler_staff')
            or (
              cu.role = 'buyer'
              and exists (
                select 1
                from customers c
                where c.company_id = "product_categories"."company_id"
                  and c.auth_user_id = (select auth.uid())
                  and c.is_active is true
              )
            )
          )
      ));