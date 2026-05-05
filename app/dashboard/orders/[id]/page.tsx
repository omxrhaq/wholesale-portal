import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderEditForm } from "@/components/orders/order-edit-form";
import { OrderStatusForm } from "@/components/orders/order-status-form";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCompanyContext } from "@/lib/companies/context";
import { formatCurrency, formatDate } from "@/lib/format";
import { getUserLocale, type AppLocale } from "@/lib/i18n";
import { getOrderById } from "@/lib/services/order-service";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);
  const locale = await getUserLocale();
  const order = await getOrderById(context.company.id, id);
  const selectedSort = isOrderItemSort(query.sort) ? query.sort : "product_asc";
  const t = getOrderDetailCopy(locale);

  if (!order) {
    notFound();
  }

  const sortedItems = sortOrderItems(order.items, selectedSort);
  const latestStatusActor = getLatestStatusActor(order.timeline);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
            {t.orderDetail}
          </p>
          <h2 className="text-3xl font-semibold text-foreground">
            {order.id.slice(0, 8).toUpperCase()}
          </h2>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/orders">{t.backToOrders}</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(380px,520px)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardDescription>{t.status}</CardDescription>
            <CardTitle>
              <OrderStatusBadge status={order.status} locale={locale} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.lastUpdatedOn} {formatDate(order.updatedAt, locale)}
              {latestStatusActor ? ` ${t.by} ${latestStatusActor}` : ""}.
            </p>
            <OrderStatusForm
              orderId={order.id}
              currentStatus={order.status}
              timeline={order.timeline}
              locale={locale}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.summary}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {t.customer}
              </p>
              <p className="text-base font-semibold text-foreground">
                {order.customerName}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.customerEmail ?? t.noEmail}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.customerPhone ?? t.noPhone}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {t.totalAmount}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(order.totalAmount, locale)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {t.createdOn}
                </p>
                <p className="text-sm text-foreground/80">
                  {formatDate(order.createdAt, locale)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {order.status === "new" ? (
        <Card>
          <CardContent className="p-6">
            <OrderEditForm
              orderId={order.id}
              locale={locale}
              initialNotes={order.notes}
              initialItems={order.items.map((item) => ({
                id: item.id,
                productNameSnapshot: item.productNameSnapshot,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
              }))}
              copy={{
                editTitle: t.editTitle,
                editDescription: t.editDescription,
                quantity: t.quantity,
                unitPrice: t.unitPrice,
                lineTotal: t.lineTotal,
                notes: t.notes,
                draftTotal: t.draftTotal,
                saveDraft: t.saveDraft,
                savingDraft: t.savingDraft,
                resetChanges: t.resetChanges,
                draftSaved: t.draftSaved,
                saveFailed: t.saveFailed,
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <div>
        <Card>
          <CardHeader>
            <CardTitle>{t.orderItems}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
                <thead className="bg-muted/70 text-left text-muted-foreground">
                  <tr>
                    <SortableHeader
                      label={t.product}
                      orderId={order.id}
                      sortKey="product"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.quantity}
                      orderId={order.id}
                      sortKey="quantity"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.unitPrice}
                      orderId={order.id}
                      sortKey="unit_price"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.lineTotal}
                      orderId={order.id}
                      sortKey="line_total"
                      activeSort={selectedSort}
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {sortedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/45">
                      <td className="px-4 py-4 font-medium text-foreground">
                        {item.productNameSnapshot}
                      </td>
                      <td className="px-4 py-4 text-foreground/80">{item.quantity}</td>
                      <td className="px-4 py-4 text-foreground/80">
                        {formatCurrency(item.unitPrice, locale)}
                      </td>
                      <td className="px-4 py-4 text-foreground/80">
                        {formatCurrency(item.lineTotal, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.notes ? (
              <div className="mt-6 rounded-2xl border border-border/70 bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">{t.notes}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {order.notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

type OrderItemSort =
  | "product_asc"
  | "product_desc"
  | "quantity_asc"
  | "quantity_desc"
  | "unit_price_asc"
  | "unit_price_desc"
  | "line_total_asc"
  | "line_total_desc";

function SortableHeader({
  label,
  orderId,
  sortKey,
  activeSort,
}: {
  label: string;
  orderId: string;
  sortKey: "product" | "quantity" | "unit_price" | "line_total";
  activeSort: OrderItemSort;
}) {
  const isActive = activeSort.startsWith(`${sortKey}_`);
  const direction = isActive && activeSort.endsWith("_asc") ? "asc" : "desc";
  const indicator = isActive ? (direction === "asc" ? "↑" : "↓") : "↕";
  const nextSort = getNextSort(sortKey, activeSort);

  return (
    <th className="px-4 py-3 font-medium">
      <Link
        href={buildOrderDetailUrl(orderId, nextSort)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <span aria-hidden>{indicator}</span>
      </Link>
    </th>
  );
}

function buildOrderDetailUrl(orderId: string, sort: OrderItemSort) {
  if (sort === "product_asc") {
    return `/dashboard/orders/${orderId}`;
  }

  return `/dashboard/orders/${orderId}?sort=${sort}`;
}

function isOrderItemSort(value: string | undefined): value is OrderItemSort {
  if (!value) {
    return false;
  }

  return [
    "product_asc",
    "product_desc",
    "quantity_asc",
    "quantity_desc",
    "unit_price_asc",
    "unit_price_desc",
    "line_total_asc",
    "line_total_desc",
  ].includes(value);
}

function getNextSort(
  sortKey: "product" | "quantity" | "unit_price" | "line_total",
  activeSort: OrderItemSort,
) {
  const desc = `${sortKey}_desc` as OrderItemSort;
  const asc = `${sortKey}_asc` as OrderItemSort;

  if (activeSort === desc) {
    return asc;
  }

  return desc;
}

function getLatestStatusActor(
  timeline: Array<{
    type: "created" | "status_changed";
    actor: {
      name: string;
      email: string | null;
    };
  }>,
) {
  const statusChange = [...timeline]
    .reverse()
    .find((entry) => entry.type === "status_changed");

  if (statusChange) {
    return statusChange.actor.name || statusChange.actor.email;
  }

  const createdEntry = timeline[0];
  if (!createdEntry) {
    return null;
  }

  return createdEntry.actor.name || createdEntry.actor.email;
}

function sortOrderItems<T extends {
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}>(items: T[], sort: OrderItemSort) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "product_asc":
        return a.productNameSnapshot.localeCompare(
          b.productNameSnapshot,
          "nl-BE",
        );
      case "product_desc":
        return b.productNameSnapshot.localeCompare(
          a.productNameSnapshot,
          "nl-BE",
        );
      case "quantity_asc":
        return a.quantity - b.quantity;
      case "quantity_desc":
        return b.quantity - a.quantity;
      case "unit_price_asc":
        return a.unitPrice - b.unitPrice;
      case "unit_price_desc":
        return b.unitPrice - a.unitPrice;
      case "line_total_asc":
        return a.lineTotal - b.lineTotal;
      case "line_total_desc":
        return b.lineTotal - a.lineTotal;
      default:
        return 0;
    }
  });

  return sorted;
}

function getOrderDetailCopy(locale: AppLocale) {
  const copy = {
    en: {
      orderDetail: "Order detail",
      backToOrders: "Back to orders",
      status: "Status",
      lastUpdatedOn: "Last updated on",
      by: "by",
      customer: "Customer",
      noEmail: "No email",
      noPhone: "No phone",
      totalAmount: "Total amount",
      summary: "Summary",
      createdOn: "Created on",
      orderItems: "Order items",
      orderItemsDescription:
        "Snapshot of product name and price at the time of ordering.",
      product: "Product",
      quantity: "Quantity",
      unitPrice: "Unit price",
      lineTotal: "Line total",
      notes: "Notes",
      editTitle: "Edit order",
      editDescription: "While the status is still new, you can adjust notes and line quantities here.",
      draftTotal: "Updated total",
      saveDraft: "Save order",
      savingDraft: "Saving order...",
      resetChanges: "Reset changes",
      draftSaved: "Order updated.",
      saveFailed: "Failed to update order.",
      timeline: "Timeline",
      timelineDescription: "Track who created the order and every valid status change after that.",
      orderCreated: "Order created",
      changedBy: "Changed by",
      statusChangedFromTo: (from: string, to: string) =>
        `Status changed from ${from} to ${to}`,
      statusChangedTo: (to: string) => `Status changed to ${to}`,
      unknownActor: "Unknown user",
    },
    nl: {
      orderDetail: "Orderdetail",
      backToOrders: "Terug naar orders",
      status: "Status",
      lastUpdatedOn: "Laatst bijgewerkt op",
      by: "door",
      customer: "Klant",
      noEmail: "Geen e-mail",
      noPhone: "Geen telefoon",
      totalAmount: "Totaalbedrag",
      summary: "Samenvatting",
      createdOn: "Aangemaakt op",
      orderItems: "Orderregels",
      orderItemsDescription:
        "Snapshot van productnaam en prijs op het moment van bestellen.",
      product: "Product",
      quantity: "Aantal",
      unitPrice: "Stukprijs",
      lineTotal: "Lijntotaal",
      notes: "Notities",
      editTitle: "Order bewerken",
      editDescription: "Zolang de status nog new is, kun je hier notities en aantallen aanpassen.",
      draftTotal: "Nieuw totaal",
      saveDraft: "Order opslaan",
      savingDraft: "Order opslaan...",
      resetChanges: "Wijzigingen resetten",
      draftSaved: "Order bijgewerkt.",
      saveFailed: "Order bijwerken mislukt.",
      timeline: "Tijdlijn",
      timelineDescription: "Volg wie de order heeft aangemaakt en elke geldige statuswijziging daarna.",
      orderCreated: "Order aangemaakt",
      changedBy: "Gewijzigd door",
      statusChangedFromTo: (from: string, to: string) =>
        `Status gewijzigd van ${from} naar ${to}`,
      statusChangedTo: (to: string) => `Status gewijzigd naar ${to}`,
      unknownActor: "Onbekende gebruiker",
    },
    fr: {
      orderDetail: "Detail commande",
      backToOrders: "Retour aux commandes",
      status: "Statut",
      lastUpdatedOn: "Derniere mise a jour le",
      by: "par",
      customer: "Client",
      noEmail: "Pas d'e-mail",
      noPhone: "Pas de telephone",
      totalAmount: "Montant total",
      summary: "Resume",
      createdOn: "Creee le",
      orderItems: "Lignes de commande",
      orderItemsDescription:
        "Instantane du nom du produit et du prix au moment de la commande.",
      product: "Produit",
      quantity: "Quantite",
      unitPrice: "Prix unitaire",
      lineTotal: "Total ligne",
      notes: "Notes",
      editTitle: "Modifier la commande",
      editDescription: "Tant que le statut est encore new, vous pouvez ajuster ici les notes et les quantites.",
      draftTotal: "Nouveau total",
      saveDraft: "Enregistrer la commande",
      savingDraft: "Enregistrement...",
      resetChanges: "Reinitialiser",
      draftSaved: "Commande mise a jour.",
      saveFailed: "Impossible de mettre la commande a jour.",
      timeline: "Chronologie",
      timelineDescription: "Suivez qui a cree la commande et chaque changement de statut valide ensuite.",
      orderCreated: "Commande creee",
      changedBy: "Modifie par",
      statusChangedFromTo: (from: string, to: string) =>
        `Statut modifie de ${from} a ${to}`,
      statusChangedTo: (to: string) => `Statut modifie vers ${to}`,
      unknownActor: "Utilisateur inconnu",
    },
  } as const;

  return copy[locale];
}
