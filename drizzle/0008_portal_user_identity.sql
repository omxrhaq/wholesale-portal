ALTER TABLE "customers" RENAME COLUMN "auth_user_id" TO "portal_user_id";--> statement-breakpoint
ALTER INDEX "customers_auth_user_idx" RENAME TO "customers_portal_user_idx";--> statement-breakpoint
ALTER INDEX "customers_company_auth_user_idx" RENAME TO "customers_company_portal_user_idx";
