"use client";

import { CheckCircle2, Info, LoaderCircle, Lock, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateOrderStatusAction } from "@/app/dashboard/orders/actions";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import type { AppLocale } from "@/lib/i18n";
import { getOrderStatusFormCopy } from "@/lib/i18n-copy";
import type { OrderTimelineEntry } from "@/lib/services/order-service";
import {
  canTransitionOrderStatus,
  getAllowedNextOrderStatuses,
  getOrderStatusLabel,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

const primaryWorkflowStatuses: OrderStatus[] = [
  "new",
  "confirmed",
  "processing",
  "completed",
];

export function OrderStatusForm({
  orderId,
  currentStatus,
  timeline,
  locale = "en",
  compact = false,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  timeline?: OrderTimelineEntry[];
  locale?: AppLocale;
  compact?: boolean;
}) {
  const router = useRouter();
  const copy = getOrderStatusFormCopy(locale);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [isPending, startTransition] = useTransition();
  const allowedTransitions = getAllowedNextOrderStatuses(currentStatus);
  const isCancelled = currentStatus === "cancelled";
  const canCancel = allowedTransitions.includes("cancelled");
  const statusHistory = getStatusHistory(timeline ?? []);

  function handleTransition(nextStatus: OrderStatus) {
    if (isPending || nextStatus === currentStatus) {
      return;
    }

    setServerError(null);
    setPendingStatus(nextStatus);

    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, nextStatus);

      if (!result.success) {
        setServerError(result.error ?? copy.failed);
        setPendingStatus(null);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className={cn("w-full max-w-[32rem] space-y-4", compact && "space-y-3")}>
      <div className="space-y-3">
        <div className={cn("grid grid-cols-2 gap-2", compact && "gap-1.5")}>
          {primaryWorkflowStatuses.map((status) => {
            const isCurrent = status === currentStatus;
            const isCompletedStep =
              primaryWorkflowStatuses.indexOf(status) <
              primaryWorkflowStatuses.indexOf(currentStatus);
            const isClickable = canTransitionOrderStatus(currentStatus, status) && !isCurrent;
            const isFutureLocked = !isCurrent && !isCompletedStep && !isClickable;
            const isLoading = isPending && pendingStatus === status;
            const historyEntry = statusHistory[status];
            const historyLabel = historyEntry
              ? formatStatusHistoryLine(historyEntry, locale, copy.by)
              : null;
            const commonClassName = cn(
              "min-h-10 w-full rounded-lg border px-2.5 py-2 text-left transition",
              compact && "min-h-9 px-2 py-1.5",
              isCurrent &&
                "border-slate-900 bg-slate-950 text-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50",
              isCompletedStep &&
                "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-sky-800/80 dark:bg-sky-950/30 dark:text-sky-100",
              isClickable &&
                "border-sky-300 bg-sky-50 text-sky-950 hover:border-sky-400 hover:bg-sky-100 dark:border-blue-800/80 dark:bg-blue-950/30 dark:text-blue-100 dark:hover:border-blue-700 dark:hover:bg-blue-950/45",
              isLoading &&
                "border-sky-400 bg-sky-100 text-sky-950 dark:border-blue-700 dark:bg-blue-950/45 dark:text-blue-100",
              isFutureLocked &&
                "border-border/80 bg-muted/40 text-muted-foreground dark:bg-muted/25",
            );
            const content = (
              <span className="flex w-full items-start gap-2">
                {isLoading ? (
                  <span className="rounded-full bg-sky-100 p-0.5 text-sky-700 dark:bg-blue-900/60 dark:text-blue-200">
                    <LoaderCircle className="size-3.5 animate-spin" />
                  </span>
                ) : isCurrent ? (
                    <span className="rounded-full bg-white/15 p-0.5 text-white dark:bg-white/10 dark:text-slate-100">
                    <CheckCircle2 className="size-3" />
                  </span>
                ) : isCompletedStep ? (
                  <span className="rounded-full bg-emerald-100 p-0.5 text-emerald-700 dark:bg-sky-900/55 dark:text-sky-200">
                    <CheckCircle2 className="size-3" />
                  </span>
                ) : isClickable ? (
                  <span className="rounded-full bg-sky-100 p-0.5 text-sky-700 dark:bg-blue-900/60 dark:text-blue-200">
                    <CheckCircle2 className="size-3" />
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 p-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Lock className="size-3" />
                  </span>
                )}

                <span className="min-w-0 flex-1 truncate pt-0.5 text-[13px] font-medium">
                  {getOrderStatusLabel(status, locale)}
                </span>

                {historyLabel ? (
                  <HistoryTooltip
                    label={historyLabel}
                    tone={
                      isCurrent
                        ? "dark"
                        : isCompletedStep
                          ? "success"
                          : "neutral"
                    }
                  />
                ) : null}
              </span>
            );

            if (isClickable) {
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleTransition(status)}
                  disabled={isPending}
                  className={cn(commonClassName, isPending ? "cursor-default" : "cursor-pointer")}
                >
                  {content}
                </button>
              );
            }

            return (
              <div key={status} className={cn(commonClassName, "cursor-default")}>
                {content}
              </div>
            );
          })}
        </div>

        {isCancelled ? (
          <div className="flex justify-start">
            <div className="flex min-h-9 min-w-24 items-center gap-2 rounded-lg border border-rose-200 bg-rose-100 px-2.5 py-2 text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/30 dark:text-rose-100">
              <XCircle className="size-3.5" />
              <span className="text-[13px] font-medium">{copy.actionLabels.cancelled}</span>
              {statusHistory.cancelled ? (
                <HistoryTooltip
                  label={formatStatusHistoryLine(statusHistory.cancelled, locale, copy.by)}
                  tone="danger"
                />
              ) : null}
            </div>
          </div>
        ) : canCancel ? (
          <div className="flex justify-start">
            <Button
              type="button"
              variant="destructive"
              size={compact ? "sm" : "default"}
              onClick={() => handleTransition("cancelled")}
              disabled={isPending}
              className="min-h-9 min-w-24 rounded-lg px-2.5 text-[13px]"
            >
              <span className="flex items-center gap-2">
                {isPending && pendingStatus === "cancelled" ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                {isPending && pendingStatus === "cancelled"
                  ? copy.saving
                  : copy.actionLabels.cancelled}
              </span>
            </Button>
          </div>
        ) : null}
      </div>

      {serverError ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}
    </div>
  );
}

function getStatusHistory(entries: OrderTimelineEntry[]) {
  const history: Partial<Record<OrderStatus, OrderTimelineEntry>> = {};

  for (const entry of entries) {
    if (entry.type === "created") {
      history.new = entry;
      continue;
    }

    history[entry.nextStatus] = entry;
  }

  return history;
}

function formatStatusHistoryLine(
  entry: OrderTimelineEntry,
  locale: AppLocale,
  byLabel: string,
) {
  const actor = entry.actor.name || entry.actor.email;

  return `${formatDate(entry.occurredAt, locale)}${actor ? ` ${byLabel} ${actor}` : ""}`;
}

function HistoryTooltip({
  label,
  tone,
}: {
  label: string;
  tone: "dark" | "success" | "neutral" | "danger";
}) {
  return (
    <span className="group/info relative ml-auto inline-flex shrink-0">
      <span
        className={cn(
          "inline-flex size-4.5 items-center justify-center rounded-full border text-[10px]",
          tone === "dark" && "border-white/20 bg-white/10 text-white/85 dark:border-white/15 dark:bg-white/10 dark:text-slate-100",
          tone === "success" && "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-sky-800/80 dark:bg-sky-950/35 dark:text-sky-200",
          tone === "neutral" && "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
          tone === "danger" && "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/80 dark:bg-rose-950/30 dark:text-rose-200",
        )}
        aria-label={label}
        title={label}
      >
        <Info className="size-3" />
      </span>
      <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-52 rounded-lg border border-border/80 bg-popover px-2.5 py-2 text-xs text-popover-foreground opacity-0 shadow-lg transition group-hover/info:opacity-100 group-focus-within/info:opacity-100">
        {label}
      </span>
    </span>
  );
}
