"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateOrderStatusAction } from "@/app/dashboard/orders/actions";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/db/schema";
import type { AppLocale } from "@/lib/i18n";
import { getOrderStatusFormCopy } from "@/lib/i18n-copy";
import { getOrderStatusLabel, orderStatusOptions } from "@/lib/orders";

export function OrderStatusForm({
  orderId,
  currentStatus,
  locale = "en",
  compact = false,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  locale?: AppLocale;
  compact?: boolean;
}) {
  const router = useRouter();
  const copy = getOrderStatusFormCopy(locale);
  const [nextStatus, setNextStatus] = useState<OrderStatus>(currentStatus);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setServerError(null);

    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, nextStatus);

      if (!result.success) {
        setServerError(result.error ?? copy.failed);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {!compact ? (
          <label
            htmlFor={`order-status-${orderId}`}
            className="text-sm font-medium text-slate-950"
          >
            {copy.updateStatus}
          </label>
        ) : null}
        <select
          id={`order-status-${orderId}`}
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
          className={`flex rounded-lg border border-border bg-background px-3 py-2 text-sm ${
            compact ? "h-9 w-[150px]" : "h-11 w-full"
          }`}
        >
          {orderStatusOptions.map((option) => (
            <option key={option} value={option}>
              {getOrderStatusLabel(option, locale)}
            </option>
          ))}
        </select>
      </div>

      {serverError ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        size={compact ? "sm" : "default"}
      >
        {isPending ? copy.saving : copy.saveStatus}
      </Button>
    </div>
  );
}
