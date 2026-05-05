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
    pending: "border border-slate-300/80 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    processing: "border border-blue-200/90 bg-blue-50 text-blue-800 dark:border-blue-800/80 dark:bg-blue-950/30 dark:text-blue-100",
    completed: "border border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-800/80 dark:bg-sky-950/35 dark:text-sky-100",
    failed: "border border-rose-200/90 bg-rose-50 text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/30 dark:text-rose-100",
  };

  return classes[status];
}
