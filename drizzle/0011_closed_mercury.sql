CREATE INDEX "customers_company_name_idx" ON "customers" USING btree ("company_id","name","id");--> statement-breakpoint
CREATE INDEX "orders_company_created_idx" ON "orders" USING btree ("company_id","created_at","id");--> statement-breakpoint
CREATE INDEX "orders_company_status_created_idx" ON "orders" USING btree ("company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "products_company_updated_idx" ON "products" USING btree ("company_id","updated_at","id");