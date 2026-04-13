ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "company_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "imports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "activity_logs_select_company_staff" ON "activity_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from company_users cu
        where cu.company_id = "activity_logs"."company_id"
          and cu.user_id = (select auth.uid())
          and cu.role in ('wholesaler_owner', 'wholesaler_staff')
      ));--> statement-breakpoint
CREATE POLICY "companies_select_members" ON "companies" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from company_users cu
        where cu.company_id = "companies"."id"
          and cu.user_id = (select auth.uid())
          and (
            cu.role in ('wholesaler_owner', 'wholesaler_staff')
            or exists (
              select 1
              from customers c
              where c.company_id = "companies"."id"
                and c.auth_user_id = (select auth.uid())
                and c.is_active is true
            )
          )
      ));--> statement-breakpoint
CREATE POLICY "company_users_select_own" ON "company_users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("company_users"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "customers_select_company_staff_or_own_buyer" ON "customers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from company_users cu
        where cu.company_id = "customers"."company_id"
          and cu.user_id = (select auth.uid())
          and cu.role in ('wholesaler_owner', 'wholesaler_staff')
      )
      or (
        "customers"."auth_user_id" = (select auth.uid())
        and "customers"."is_active" is true
      ));--> statement-breakpoint
CREATE POLICY "imports_select_company_staff" ON "imports" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from company_users cu
        where cu.company_id = "imports"."company_id"
          and cu.user_id = (select auth.uid())
          and cu.role in ('wholesaler_owner', 'wholesaler_staff')
      ));--> statement-breakpoint
CREATE POLICY "order_items_select_visible_orders" ON "order_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from orders o
        inner join customers c on c.id = o.customer_id
        where o.id = "order_items"."order_id"
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
      ));--> statement-breakpoint
CREATE POLICY "orders_select_company_staff_or_own_buyer" ON "orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from company_users cu
        where cu.company_id = "orders"."company_id"
          and cu.user_id = (select auth.uid())
          and cu.role in ('wholesaler_owner', 'wholesaler_staff')
      )
      or exists (
        select 1
        from customers c
        where c.id = "orders"."customer_id"
          and c.company_id = "orders"."company_id"
          and c.auth_user_id = (select auth.uid())
          and c.is_active is true
      ));--> statement-breakpoint
CREATE POLICY "products_select_company_members" ON "products" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from company_users cu
        where cu.company_id = "products"."company_id"
          and cu.user_id = (select auth.uid())
          and (
            cu.role in ('wholesaler_owner', 'wholesaler_staff')
            or (
              cu.role = 'buyer'
              and "products"."is_active" is true
              and exists (
                select 1
                from customers c
                where c.company_id = "products"."company_id"
                  and c.auth_user_id = (select auth.uid())
                  and c.is_active is true
              )
            )
          )
      ));--> statement-breakpoint
CREATE POLICY "profiles_select_own" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."id" = (select auth.uid()));