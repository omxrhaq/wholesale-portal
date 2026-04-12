import type { OrderStatus } from "@/lib/db/schema";
import type { AppLocale } from "@/lib/i18n";

export const orderStatusOptions: OrderStatus[] = [
  "new",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
];

export function getOrderStatusLabel(
  status: OrderStatus,
  locale: AppLocale = "en",
) {
  const labelsByLocale: Record<AppLocale, Record<OrderStatus, string>> = {
    en: {
      new: "New",
      confirmed: "Confirmed",
      processing: "Processing",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    nl: {
      new: "Nieuw",
      confirmed: "Bevestigd",
      processing: "In verwerking",
      completed: "Voltooid",
      cancelled: "Geannuleerd",
    },
    fr: {
      new: "Nouveau",
      confirmed: "Confirme",
      processing: "En traitement",
      completed: "Termine",
      cancelled: "Annule",
    },
  };

  return labelsByLocale[locale][status];
}

export function isOpenOrderStatus(status: OrderStatus) {
  return status === "new" || status === "confirmed" || status === "processing";
}

export function getOrderStatusClasses(status: OrderStatus) {
  switch (status) {
    case "new":
      return "bg-slate-200 text-slate-700";
    case "confirmed":
      return "bg-sky-100 text-sky-900";
    case "processing":
      return "bg-amber-100 text-amber-900";
    case "completed":
      return "bg-emerald-100 text-emerald-900";
    case "cancelled":
      return "bg-rose-100 text-rose-900";
  }
}
