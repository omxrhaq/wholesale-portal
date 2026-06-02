UPDATE "admin_audit_logs"
SET "metadata" = NULL
WHERE "metadata" IS NOT NULL;
