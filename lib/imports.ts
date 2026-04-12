import type { ImportStatus } from "@/lib/db/schema";
import type { AppLocale } from "@/lib/i18n";

export function getImportStatusLabel(status: ImportStatus, locale: AppLocale = "en") {
  const labels: Record<AppLocale, Record<ImportStatus, string>> = {
    en: {
      pending: "Queued",
      processing: "Processing",
      completed: "Completed",
      failed: "Failed",
    },
    nl: {
      pending: "In wachtrij",
      processing: "Bezig",
      completed: "Voltooid",
      failed: "Mislukt",
    },
    fr: {
      pending: "En file",
      processing: "En cours",
      completed: "Termine",
      failed: "Echoue",
    },
  };

  return labels[locale][status];
}

export function getImportStatusClasses(status: ImportStatus) {
  const classes: Record<ImportStatus, string> = {
    pending: "bg-slate-100 text-slate-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };

  return classes[status];
}
