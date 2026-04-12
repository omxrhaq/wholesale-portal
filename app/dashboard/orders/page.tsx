import Link from "next/link";

import { OrdersFilterBar } from "@/components/orders/orders-filter-bar";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCompanyContext } from "@/lib/companies/context";
import type { OrderStatus } from "@/lib/db/schema";
import { formatCurrency, formatDate } from "@/lib/format";
import { getUserLocale, type AppLocale } from "@/lib/i18n";
import { getOrderStatusLabel, orderStatusOptions } from "@/lib/orders";
import {
  getOrderOverviewStats,
  getOrderViewCounts,
  listOrders,
} from "@/lib/services/order-service";

type OrdersSearchParams = {
  view?: string;
  q?: string;
  sort?: string;
  page?: string;
};

type OrderSort =
  | "created_desc"
  | "created_asc"
  | "updated_desc"
  | "updated_asc"
  | "amount_desc"
  | "amount_asc"
  | "customer_asc"
  | "customer_desc"
  | "status_asc"
  | "status_desc"
  | "order_desc"
  | "order_asc"
  | "items_desc"
  | "items_asc";

type OrdersView = "all" | "open" | OrderStatus;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrdersSearchParams>;
}) {
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);
  const locale = await getUserLocale();
  const params = await searchParams;
  const selectedView = isView(params.view) ? params.view : "all";
  const selectedSort = isSort(params.sort) ? params.sort : "created_desc";
  const page = Math.max(1, Number(params.page || "1") || 1);
  const query = params.q?.trim() ?? "";
  const t = getOrdersCopy(locale);

  const [orders, viewCounts, overviewStats] = await Promise.all([
    listOrders({
      companyId: context.company.id,
      statuses: getStatusesForView(selectedView),
      query,
      sort: selectedSort,
      page,
    }),
    getOrderViewCounts({
      companyId: context.company.id,
      query,
    }),
    getOrderOverviewStats(context.company.id),
  ]);
  const views: Array<{ key: OrdersView; label: string; count: number }> = [
    { key: "all", label: t.all, count: viewCounts.all },
    { key: "open", label: t.open, count: viewCounts.open },
    ...orderStatusOptions.map((statusOption) => ({
      key: statusOption,
      label: getOrderStatusLabel(statusOption, locale),
      count: viewCounts.statusCounts[statusOption],
    })),
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label={t.results}
          value={overviewStats.totalCount}
          description={t.totalOrders(context.company.name)}
        />
        <MetricCard
          label={t.open}
          value={overviewStats.openCount}
          description={t.openDescription}
        />
        <MetricCard
          label={t.totalRevenue}
          value={formatCurrency(overviewStats.totalAmount, locale)}
          description={t.totalRevenueDescription}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.orders}</CardTitle>
          <CardDescription>
            {t.cardDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {views.map((view) => {
              const isActive = selectedView === view.key;

              return (
                <Link
                  key={view.key}
                  href={buildOrdersUrl({ ...params, view: view.key }, 1)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-border bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  <span>{view.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {view.count}
                  </span>
                </Link>
              );
            })}
          </div>

          <OrdersFilterBar
            query={query}
            label={t.search}
            placeholder={t.searchPlaceholder}
          />

          {orders.totalCount === 0 ? (
            <div className="rounded-2xl border border-border/70 bg-white px-4 py-10 text-center text-sm text-muted-foreground">
              {query || selectedView !== "all"
                ? t.noOrdersForFilters
                : t.noOrdersYet}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <table className="min-w-full divide-y divide-border bg-white text-sm">
                <thead className="bg-slate-50/80 text-left text-slate-600">
                  <tr>
                    <SortableHeader
                      label={t.order}
                      params={params}
                      sortKey="order"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.customer}
                      params={params}
                      sortKey="customer"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.items}
                      params={params}
                      sortKey="items"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.status}
                      params={params}
                      sortKey="status"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.total}
                      params={params}
                      sortKey="amount"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.created}
                      params={params}
                      sortKey="created"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.updated}
                      params={params}
                      sortKey="updated"
                      activeSort={selectedSort}
                    />
                    <th className="px-4 py-3 font-medium text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {orders.rows.map((order) => (
                    <tr key={order.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="block font-medium text-slate-950 underline-offset-4 hover:underline"
                        >
                          {order.id.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <div>{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.customerEmail ?? t.noEmail}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.customerPhone ?? t.noPhone}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{order.itemCount}</td>
                      <td className="px-4 py-4">
                        <OrderStatusBadge status={order.status} locale={locale} />
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatCurrency(order.totalAmount, locale)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatDate(order.createdAt, locale)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatDate(order.updatedAt, locale)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/orders/${order.id}`}>
                              {t.view}
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t.page(orders.page, orders.totalPages)}
            </p>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className={orders.page <= 1 ? "pointer-events-none opacity-50" : ""}
              >
                <Link href={buildOrdersUrl(params, orders.page - 1)}>{t.previous}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className={
                  orders.page >= orders.totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              >
                <Link href={buildOrdersUrl(params, orders.page + 1)}>{t.next}</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function SortableHeader({
  label,
  params,
  sortKey,
  activeSort,
}: {
  label: string;
  params: OrdersSearchParams;
  sortKey:
    | "order"
    | "created"
    | "updated"
    | "amount"
    | "customer"
    | "status"
    | "items";
  activeSort: OrderSort;
}) {
  const nextSort = getNextSort(sortKey, activeSort);
  const isActive = activeSort.startsWith(`${sortKey}_`);
  const direction = activeSort.endsWith("_asc") ? "↑" : "↓";

  return (
    <th className="px-4 py-3 font-medium">
      <Link
        href={buildOrdersUrl({ ...params, sort: nextSort }, 1)}
        className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
      >
        {label}
        {isActive ? <span aria-hidden="true">{direction}</span> : null}
      </Link>
    </th>
  );
}

function buildOrdersUrl(params: OrdersSearchParams, page: number) {
  const search = new URLSearchParams();

  if (params.q) {
    search.set("q", params.q);
  }

  if (params.view && params.view !== "all") {
    search.set("view", params.view);
  }

  if (params.sort && params.sort !== "created_desc") {
    search.set("sort", params.sort);
  }

  if (page > 1) {
    search.set("page", String(page));
  }

  const query = search.toString();
  return query ? `/dashboard/orders?${query}` : "/dashboard/orders";
}

function isView(value?: string): value is OrdersView {
  return (
    value === "all" ||
    value === "open" ||
    orderStatusOptions.some((statusOption) => statusOption === value)
  );
}

function getStatusesForView(view: OrdersView): OrderStatus[] | undefined {
  switch (view) {
    case "open":
      return ["new", "confirmed", "processing"];
    case "all":
      return undefined;
    default:
      return [view];
  }
}

function getOrdersCopy(locale: AppLocale) {
  const copy = {
    en: {
      all: "All",
      open: "Open",
      results: "Results",
      totalOrders: (name: string) => `Total orders for ${name}.`,
      openDescription: "New, confirmed, and processing orders across all views.",
      totalRevenue: "Total revenue",
      totalRevenueDescription: "Total value of all orders.",
      orders: "Orders",
      order: "Order",
      cardDescription: "Select a status-based view and then search within that selection.",
      search: "Search",
      searchPlaceholder: "Search by customer, email, or order number",
      noOrdersForFilters: "No orders found for these filters.",
      noOrdersYet: "No orders received yet.",
      customer: "Customer",
      items: "Items",
      status: "Status",
      total: "Total",
      created: "Created",
      updated: "Updated",
      actions: "Actions",
      noEmail: "No email",
      noPhone: "No phone",
      view: "View",
      page: (current: number, total: number) => `Page ${current} of ${total}`,
      previous: "Previous",
      next: "Next",
    },
    nl: {
      all: "Alle",
      open: "Open",
      results: "Resultaten",
      totalOrders: (name: string) => `Totaal aantal orders voor ${name}.`,
      openDescription: "Nieuwe, bevestigde en verwerkende orders over alle views.",
      totalRevenue: "Totale omzet",
      totalRevenueDescription: "Totale waarde van alle orders.",
      orders: "Orders",
      order: "Order",
      cardDescription: "Kies een view op basis van status en zoek binnen die selectie.",
      search: "Zoeken",
      searchPlaceholder: "Zoek op klant, e-mail of ordernummer",
      noOrdersForFilters: "Geen orders gevonden voor deze filters.",
      noOrdersYet: "Nog geen orders ontvangen.",
      customer: "Klant",
      items: "Regels",
      status: "Status",
      total: "Totaal",
      created: "Aangemaakt",
      updated: "Bijgewerkt",
      actions: "Acties",
      noEmail: "Geen e-mail",
      noPhone: "Geen telefoon",
      view: "Bekijken",
      page: (current: number, total: number) => `Pagina ${current} van ${total}`,
      previous: "Vorige",
      next: "Volgende",
    },
    fr: {
      all: "Tous",
      open: "Ouvert",
      results: "Resultats",
      totalOrders: (name: string) => `Nombre total de commandes pour ${name}.`,
      openDescription: "Commandes nouvelles, confirmees et en traitement sur toutes les vues.",
      totalRevenue: "Chiffre total",
      totalRevenueDescription: "Valeur totale de toutes les commandes.",
      orders: "Commandes",
      order: "Commande",
      cardDescription: "Choisissez une vue par statut puis recherchez dans cette selection.",
      search: "Rechercher",
      searchPlaceholder: "Rechercher par client, e-mail ou numero de commande",
      noOrdersForFilters: "Aucune commande trouvee pour ces filtres.",
      noOrdersYet: "Aucune commande recue pour le moment.",
      customer: "Client",
      items: "Lignes",
      status: "Statut",
      total: "Total",
      created: "Creee",
      updated: "Mise a jour",
      actions: "Actions",
      noEmail: "Pas d'e-mail",
      noPhone: "Pas de telephone",
      view: "Voir",
      page: (current: number, total: number) => `Page ${current} sur ${total}`,
      previous: "Precedent",
      next: "Suivant",
    },
  } as const;

  return copy[locale];
}

function isSort(value?: string): value is OrderSort {
  return [
    "created_desc",
    "created_asc",
    "updated_desc",
    "updated_asc",
    "amount_desc",
    "amount_asc",
    "customer_asc",
    "customer_desc",
    "status_asc",
    "status_desc",
    "order_desc",
    "order_asc",
    "items_desc",
    "items_asc",
  ].includes(value ?? "");
}

function getNextSort(
  sortKey:
    | "order"
    | "created"
    | "updated"
    | "amount"
    | "customer"
    | "status"
    | "items",
  activeSort: OrderSort,
): OrderSort {
  const desc = `${sortKey}_desc` as OrderSort;
  const ascSort = `${sortKey}_asc` as OrderSort;

  return activeSort === desc ? ascSort : desc;
}
