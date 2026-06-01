CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action_type" varchar(120) NOT NULL,
	"target_type" varchar(80) NOT NULL,
	"target_id" uuid,
	"company_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "super_admins" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "super_admins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_idx" ON "admin_audit_logs" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_company_idx" ON "admin_audit_logs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_idx" ON "admin_audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE POLICY "admin_audit_logs_select_super_admins" ON "admin_audit_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from super_admins sa
        where sa.user_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "super_admins_select_self" ON "super_admins" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("super_admins"."user_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "product_categories_select_company_members" ON "product_categories" TO authenticated USING (exists (
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
                and c.portal_user_id = (select auth.uid())
                  and c.is_active is true
              )
            )
          )
      ));