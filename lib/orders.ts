import type { OrderStatus } from "@/lib/db/schema";
import type { AppLocale } from "@/lib/i18n";

export const orderStatusOptions: OrderStatus[] = [
  "new",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
];

export const allowedOrderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

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

export function getAllowedNextOrderStatuses(status: OrderStatus) {
  return allowedOrderStatusTransitions[status];
}

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  if (currentStatus === nextStatus) {
    return true;
  }

  return allowedOrderStatusTransitions[currentStatus].includes(nextStatus);
}

export function getOrderStatusClasses(status: OrderStatus) {
  switch (status) {
    case "new":
      return "border border-slate-300/80 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
    case "confirmed":
      return "border border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-800/80 dark:bg-sky-950/35 dark:text-sky-100";
    case "processing":
      return "border border-blue-200/90 bg-blue-100/80 text-blue-900 dark:border-blue-800/80 dark:bg-blue-950/35 dark:text-blue-100";
    case "completed":
      return "border border-indigo-200/90 bg-indigo-100/80 text-indigo-900 dark:border-indigo-800/80 dark:bg-indigo-950/35 dark:text-indigo-100";
    case "cancelled":
      return "border border-rose-200/90 bg-rose-50 text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/30 dark:text-rose-100";
  }
}
