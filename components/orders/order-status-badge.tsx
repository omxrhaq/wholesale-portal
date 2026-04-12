import type { OrderStatus } from "@/lib/db/schema";
import type { AppLocale } from "@/lib/i18n";
import { getOrderStatusClasses, getOrderStatusLabel } from "@/lib/orders";

export function OrderStatusBadge({
  status,
  locale = "en",
}: {
  status: OrderStatus;
  locale?: AppLocale;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getOrderStatusClasses(
        status,
      )}`}
    >
      {getOrderStatusLabel(status, locale)}
    </span>
  );
}
