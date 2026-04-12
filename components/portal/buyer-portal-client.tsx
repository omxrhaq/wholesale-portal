"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

import { placePortalOrderAction } from "@/app/portal/actions";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { OrderStatus } from "@/lib/db/schema";
import type { AppLocale } from "@/lib/i18n";
import type { getPortalCopy } from "@/lib/i18n-copy";

function getInitialPortalDraft(storageKey: string) {
  if (typeof window === "undefined") {
    return {
      quantities: {} as Record<string, number>,
      notes: "",
    };
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return {
      quantities: {} as Record<string, number>,
      notes: "",
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      quantities?: Record<string, number>;
      notes?: string;
    };
    const nextQuantities: Record<string, number> = {};
    for (const [productId, quantity] of Object.entries(parsed.quantities ?? {})) {
      const safeQuantity = Number.isFinite(quantity)
        ? Math.max(0, Math.floor(quantity))
        : 0;
      if (safeQuantity > 0) {
        nextQuantities[productId] = safeQuantity;
      }
    }

    return {
      quantities: nextQuantities,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    localStorage.removeItem(storageKey);
    return {
      quantities: {} as Record<string, number>,
      notes: "",
    };
  }
}

type BuyerPortalClientProps = {
  locale: AppLocale;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    description: string | null;
    unit: string;
    price: number;
  }>;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
  orderHistory: Array<{
    id: string;
    status: OrderStatus;
    totalAmount: number;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      orderId: string;
      productId: string;
      productNameSnapshot: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  }>;
  copy: ReturnType<typeof getPortalCopy>;
};

export function BuyerPortalClient({
  locale,
  products,
  customer,
  orderHistory,
  copy,
}: BuyerPortalClientProps) {
  const storageKey = `portal-cart:v1:${customer.id}`;
  const initialDraft = useMemo(() => getInitialPortalDraft(storageKey), [storageKey]);
  const [notes, setNotes] = useState(initialDraft.notes);
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(initialDraft.quantities);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);

  const filteredProducts = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();

    if (!q) {
      return products;
    }

    return products.filter((product) => {
      const haystack = `${product.name} ${product.sku} ${product.unit}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [deferredSearch, products]);

  const cartItems = useMemo(() => {
    return products
      .map((product) => ({
        ...product,
        quantity: quantities[product.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);
  }, [products, quantities]);

  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        quantities,
        notes,
      }),
    );
  }, [notes, quantities, storageKey]);

  function updateQuantity(productId: string, rawValue: string) {
    setQuantities((current) => {
      const trimmed = rawValue.trim();

      if (trimmed === "") {
        const next = { ...current };
        delete next[productId];
        return next;
      }

      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return current;
      }

      const normalized = Math.max(0, Math.floor(parsed));
      if (normalized <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }

      return {
        ...current,
        [productId]: normalized,
      };
    });
  }

  function handleReorder(orderId: string) {
    const sourceOrder = orderHistory.find((order) => order.id === orderId);
    if (!sourceOrder) {
      return;
    }

    const allowedProductIds = new Set(products.map((product) => product.id));
    const nextQuantities: Record<string, number> = { ...quantities };
    let addedLines = 0;

    for (const item of sourceOrder.items) {
      if (allowedProductIds.has(item.productId)) {
        nextQuantities[item.productId] = (nextQuantities[item.productId] ?? 0) + item.quantity;
        addedLines += 1;
      }
    }

    setQuantities(nextQuantities);
    setFeedback(
      formatTemplate(copy.orderCopied, {
        id: orderId.slice(0, 8).toUpperCase(),
        count: String(addedLines),
      }),
    );
    setError(null);
  }

  function handlePlaceOrder() {
    setFeedback(null);
    setError(null);

    const items = cartItems.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
    }));

    if (items.length === 0) {
      setError(copy.addOneProduct);
      return;
    }

    const confirmed = window.confirm(
      copy.confirmOrder,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await placePortalOrderAction({
        notes,
        items,
      });

      if (!result.success) {
        setError(result.error ?? copy.orderFailed);
        return;
      }

      setQuantities({});
      setNotes("");
      localStorage.removeItem(storageKey);
      setFeedback(
        formatTemplate(copy.orderPlaced, {
          id: result.orderId?.slice(0, 8).toUpperCase() ?? "",
        }),
      );
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>{copy.catalog}</CardTitle>
          <CardDescription>
            {copy.orderingAs} <strong>{customer.name}</strong>
            {customer.email ? (
              <span className="text-muted-foreground"> ({customer.email})</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.searchProducts}
            aria-label={copy.searchProducts}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="overflow-hidden rounded-2xl border border-border/70">
            <table className="min-w-full divide-y divide-border bg-white text-sm">
              <thead className="bg-slate-50/80 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">{copy.productName}</th>
                  <th className="px-4 py-3 font-medium">{copy.price}</th>
                  <th className="px-4 py-3 font-medium">{copy.unit}</th>
                  <th className="px-4 py-3 font-medium">{copy.quantity}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      {copy.noProductsFound}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{product.name}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatCurrency(product.price, locale)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{product.unit}</td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={quantities[product.id]?.toString() ?? ""}
                          onChange={(event) =>
                            updateQuantity(product.id, event.target.value)
                          }
                          placeholder="0"
                          className="h-10 w-24 rounded-md border border-border px-3 py-2"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{copy.cart}</CardTitle>
            <CardDescription>{copy.cartDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              {cartItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{copy.noProductsSelected}</p>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-950">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.price, locale)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency(item.price * item.quantity, locale)}
                      </p>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3">
                    <p className="flex items-center justify-between text-sm font-semibold text-slate-950">
                      <span>{copy.total}</span>
                      <span>{formatCurrency(total, locale)}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="portal-notes" className="text-sm font-medium text-slate-950">
                {copy.optionalNote}
              </label>
              <textarea
                id="portal-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            {feedback ? (
              <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {feedback}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isPending || cartItems.length === 0}
              className="w-full"
            >
              {isPending ? copy.placingOrder : copy.orderNow}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copy.orderHistory}</CardTitle>
            <CardDescription>{copy.historyDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderHistory.length === 0 ? (
              <p className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                {copy.noPreviousOrders}
              </p>
            ) : (
              orderHistory.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-border/70 bg-white px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-950">
                        {order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt, locale)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTemplate(
                          order.items.length === 1
                            ? copy.lineCountSingular
                            : copy.lineCountPlural,
                          { count: String(order.items.length) },
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={order.status} locale={locale} />
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency(order.totalAmount, locale)}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleReorder(order.id)}
                      >
                        {copy.reorder}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, value),
    template,
  );
}
