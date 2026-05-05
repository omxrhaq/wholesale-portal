"use client";

import { RotateCcw, Save } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateOrderDraftAction } from "@/app/dashboard/orders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import type { AppLocale } from "@/lib/i18n";

type EditableOrderItem = {
  id: string;
  productNameSnapshot: string;
  unitPrice: number;
  quantity: number;
};

type OrderEditFormProps = {
  orderId: string;
  locale: AppLocale;
  initialNotes: string | null;
  initialItems: EditableOrderItem[];
  copy: {
    editTitle: string;
    editDescription: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    notes: string;
    draftTotal: string;
    saveDraft: string;
    savingDraft: string;
    resetChanges: string;
    draftSaved: string;
    saveFailed: string;
  };
};

export function OrderEditForm({
  orderId,
  locale,
  initialNotes,
  initialItems,
  copy,
}: OrderEditFormProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [items, setItems] = useState<EditableOrderItem[]>(initialItems);
  const [serverError, setServerError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    notes !== (initialNotes ?? "") ||
    items.some((item, index) => item.quantity !== initialItems[index]?.quantity);

  const totalAmount = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.unitPrice * Math.max(0, item.quantity), 0),
    [items],
  );

  function updateQuantity(itemId: string, rawValue: string) {
    const nextQuantity =
      rawValue.trim() === "" ? 0 : Math.max(0, Math.floor(Number(rawValue) || 0));

    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, quantity: nextQuantity } : item,
      ),
    );
    setServerError(null);
    setFeedback(null);
  }

  function resetForm() {
    setItems(initialItems);
    setNotes(initialNotes ?? "");
    setServerError(null);
    setFeedback(null);
  }

  function handleSubmit() {
    setServerError(null);
    setFeedback(null);

    startTransition(async () => {
      const result = await updateOrderDraftAction(orderId, {
        notes,
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      });

      if (!result.success) {
        setServerError(result.error ?? copy.saveFailed);
        return;
      }

      setFeedback(copy.draftSaved);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{copy.editTitle}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{copy.editDescription}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70">
        <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
          <thead className="bg-muted/70 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">{copy.quantity}</th>
              <th className="px-4 py-3 font-medium">{copy.unitPrice}</th>
              <th className="px-4 py-3 font-medium">{copy.lineTotal}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {items.map((item) => {
              const lineTotal = item.unitPrice * Math.max(0, item.quantity);

              return (
                <tr key={item.id} className="hover:bg-accent/45">
                  <td className="px-4 py-4 font-medium text-foreground">
                    {item.productNameSnapshot}
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.id, event.target.value)}
                      className="h-10 w-24"
                    />
                  </td>
                  <td className="px-4 py-4 text-foreground/80">
                    {formatCurrency(item.unitPrice, locale)}
                  </td>
                  <td className="px-4 py-4 text-foreground/80">
                    {formatCurrency(lineTotal, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order-notes">{copy.notes}</Label>
        <Textarea
          id="order-notes"
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            setServerError(null);
            setFeedback(null);
          }}
          rows={4}
        />
      </div>

      <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-3">
        <p className="flex items-center justify-between text-sm font-medium text-foreground">
          <span>{copy.draftTotal}</span>
          <span>{formatCurrency(totalAmount, locale)}</span>
        </p>
      </div>

      {serverError ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      {feedback ? (
        <p className="rounded-xl border border-sky-200/90 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-800/80 dark:bg-sky-950/35 dark:text-sky-100">
          {feedback}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleSubmit} disabled={isPending || !isDirty}>
          <span className="flex items-center gap-2">
            <Save className="size-4" />
            {isPending ? copy.savingDraft : copy.saveDraft}
          </span>
        </Button>
        <Button type="button" variant="outline" onClick={resetForm} disabled={isPending || !isDirty}>
          <span className="flex items-center gap-2">
            <RotateCcw className="size-4" />
            {copy.resetChanges}
          </span>
        </Button>
      </div>
    </div>
  );
}
