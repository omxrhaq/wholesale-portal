import type { ImportStatus } from "@/lib/db/schema";
import type { AppLocale } from "@/lib/i18n";
import { getImportStatusClasses, getImportStatusLabel } from "@/lib/imports";

export function ImportStatusBadge({
  status,
  locale = "en",
}: {
  status: ImportStatus;
  locale?: AppLocale;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getImportStatusClasses(
        status,
      )}`}
    >
      {getImportStatusLabel(status, locale)}
    </span>
  );
}
