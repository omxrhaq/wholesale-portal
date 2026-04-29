import { Clock3, PackageCheck } from "lucide-react";

import type { OrderTimelineEntry } from "@/lib/services/order-service";
import { getOrderStatusLabel } from "@/lib/orders";
import type { AppLocale } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export function OrderTimeline({
  entries,
  locale,
  copy,
}: {
  entries: OrderTimelineEntry[];
  locale: AppLocale;
  copy: {
    orderCreated: string;
    changedBy: string;
    statusChangedFromTo: (from: string, to: string) => string;
    statusChangedTo: (to: string) => string;
    unknownActor: string;
  };
}) {
  return (
    <div className="space-y-3">
        {entries.map((entry, index) => {
          const actorName = entry.actor.name || copy.unknownActor;
          const description =
            entry.type === "created"
              ? copy.orderCreated
              : entry.previousStatus
                ? copy.statusChangedFromTo(
                    getOrderStatusLabel(entry.previousStatus, locale),
                    getOrderStatusLabel(entry.nextStatus, locale),
                  )
                : copy.statusChangedTo(
                    getOrderStatusLabel(entry.nextStatus, locale),
                  );

          return (
            <div key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="rounded-xl bg-slate-100 p-1.5 text-slate-700">
                  {entry.type === "created" ? (
                    <PackageCheck className="size-3.5" />
                  ) : (
                    <Clock3 className="size-3.5" />
                  )}
                </div>
                {index < entries.length - 1 ? (
                  <div className="mt-1.5 h-full w-px bg-border/80" />
                ) : null}
              </div>

              <div className="flex-1 rounded-xl border border-border/70 bg-white px-3 py-3">
                <p className="text-sm font-medium text-slate-950">
                  {description}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {copy.changedBy} {actorName}
                  {entry.actor.email ? ` (${entry.actor.email})` : ""}
                </p>
                {entry.actor.role ? (
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {entry.actor.role}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(entry.occurredAt, locale)}
                </p>
              </div>
            </div>
          );
        })}
    </div>
  );
}
