ALTER TABLE "orders" ADD COLUMN "inventory_reserved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "low_stock_threshold" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "products_company_stock_idx" ON "products" USING btree ("company_id","stock_quantity");