import Link from "next/link";
import {
  Clock3,
  Package2,
  ShoppingCart,
  Users,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireCompanyContext } from "@/lib/companies/context";
import { formatCurrency, formatDate } from "@/lib/format";
import { getUserLocale, type AppLocale } from "@/lib/i18n";
import { listCustomers } from "@/lib/services/customer-service";
import { getOrderOverviewStats } from "@/lib/services/order-service";
import { listOrders } from "@/lib/services/order-service";
import { listProducts } from "@/lib/services/product-service";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";

type RecentOrdersSort =
  | "customer_asc"
  | "customer_desc"
  | "status_asc"
  | "status_desc"
  | "total_asc"
  | "total_desc"
  | "date_asc"
  | "date_desc";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ recentSort?: string }>;
}) {
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);
  const locale = await getUserLocale();
  const params = await searchParams;
  const selectedSort = isRecentOrdersSort(params.recentSort)
    ? params.recentSort
    : "date_desc";
  const t = getDashboardCopy(locale);
  const [products, customers, orders, overviewStats] = await Promise.all([
    listProducts(context.company.id),
    listCustomers(context.company.id),
    listOrders({ companyId: context.company.id, pageSize: 5 }),
    getOrderOverviewStats(context.company.id),
  ]);

  const activeProducts = products.filter((product) => product.isActive).length;
  const latestOrders = sortRecentOrders(orders.rows.slice(0, 5), selectedSort);

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={Package2}
          label={t.products}
          value={String(products.length)}
          description={t.activeInCatalog(activeProducts)}
        />
        <MetricCard
          icon={Users}
          label={t.customers}
          value={String(customers.length)}
          description={t.customersDescription}
        />
        <MetricCard
          icon={ShoppingCart}
          label={t.openOrders}
          value={String(overviewStats.openCount)}
          description={t.openOrdersDescription}
        />
        <MetricCard
          icon={Clock3}
          label={t.openRevenue}
          value={formatCurrency(overviewStats.openAmount, locale)}
          description={t.openRevenueDescription}
        />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.recentOrders}</CardTitle>
            <CardDescription>
              {t.recentOrdersDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title={t.noOrders}
                description={t.recentOrdersDescription}
                className="border-border/70 bg-card/88 py-14"
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/70">
                <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
                  <thead className="bg-muted/70 text-left text-muted-foreground">
                    <tr>
                      <SortableHeader
                        label={t.customer}
                        params={params}
                        sortKey="customer"
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
                        sortKey="total"
                        activeSort={selectedSort}
                      />
                      <SortableHeader
                        label={t.date}
                        params={params}
                        sortKey="date"
                        activeSort={selectedSort}
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {latestOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-accent/45">
                        <td className="px-4 py-4">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="block"
                          >
                            <div className="font-medium text-foreground">
                              {order.customerName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.id.slice(0, 8).toUpperCase()}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="block"
                          >
                            <OrderStatusBadge status={order.status} locale={locale} />
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-foreground/80">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="block"
                          >
                            {formatCurrency(order.totalAmount, locale)}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-foreground/80">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="block"
                          >
                            {formatDate(order.createdAt, locale)}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Package2;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-5 text-primary" />
        </div>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
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
  params: { recentSort?: string };
  sortKey: "customer" | "status" | "total" | "date";
  activeSort: RecentOrdersSort;
}) {
  const isActive = activeSort.startsWith(`${sortKey}_`);
  const direction = isActive && activeSort.endsWith("_asc") ? "asc" : "desc";
  const indicator = isActive ? (direction === "asc" ? "↑" : "↓") : "↕";
  const nextSort = getNextSort(sortKey, activeSort);

  return (
    <th className="px-4 py-3 font-medium">
      <Link
        href={buildDashboardUrl({ ...params, recentSort: nextSort })}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <span aria-hidden>{indicator}</span>
      </Link>
    </th>
  );
}

function buildDashboardUrl(params: { recentSort?: string }) {
  const search = new URLSearchParams();

  if (params.recentSort && params.recentSort !== "date_desc") {
    search.set("recentSort", params.recentSort);
  }

  const query = search.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

function isRecentOrdersSort(value: string | undefined): value is RecentOrdersSort {
  if (!value) {
    return false;
  }

  return [
    "customer_asc",
    "customer_desc",
    "status_asc",
    "status_desc",
    "total_asc",
    "total_desc",
    "date_asc",
    "date_desc",
  ].includes(value);
}

function getNextSort(
  sortKey: "customer" | "status" | "total" | "date",
  activeSort: RecentOrdersSort,
) {
  const desc = `${sortKey}_desc` as RecentOrdersSort;
  const asc = `${sortKey}_asc` as RecentOrdersSort;

  if (activeSort === desc) {
    return asc;
  }

  return desc;
}

function sortRecentOrders<T extends {
  customerName: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
}>(items: T[], sort: RecentOrdersSort) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "customer_asc":
        return a.customerName.localeCompare(b.customerName, "en-US");
      case "customer_desc":
        return b.customerName.localeCompare(a.customerName, "en-US");
      case "status_asc":
        return a.status.localeCompare(b.status, "en-US");
      case "status_desc":
        return b.status.localeCompare(a.status, "en-US");
      case "total_asc":
        return a.totalAmount - b.totalAmount;
      case "total_desc":
        return b.totalAmount - a.totalAmount;
      case "date_asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "date_desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  return sorted;
}

function getDashboardCopy(locale: AppLocale) {
  const copy = {
    en: {
      products: "Products",
      activeInCatalog: (count: number) => `${count} active in your catalog.`,
      customers: "Customers",
      customersDescription: "Companies with contact details for follow-up.",
      openOrders: "Open orders",
      openOrdersDescription: "New, confirmed, or processing orders.",
      openRevenue: "Open revenue",
      openRevenueDescription: "Total value of orders still in progress.",
      recentOrders: "Recent orders",
      recentOrdersDescription: "Quick overview of the most recent incoming orders.",
      customer: "Customer",
      status: "Status",
      total: "Total",
      date: "Date",
      noOrders: "No orders available yet.",
    },
    nl: {
      products: "Producten",
      activeInCatalog: (count: number) => `${count} actief in je catalogus.`,
      customers: "Klanten",
      customersDescription: "Bedrijven met contactgegevens voor opvolging.",
      openOrders: "Open orders",
      openOrdersDescription: "Nieuwe, bevestigde of verwerkende bestellingen.",
      openRevenue: "Open omzet",
      openRevenueDescription: "Totale waarde van bestellingen die nog lopen.",
      recentOrders: "Recente orders",
      recentOrdersDescription: "Snel overzicht van de laatst binnengekomen bestellingen.",
      customer: "Klant",
      status: "Status",
      total: "Totaal",
      date: "Datum",
      noOrders: "Nog geen orders beschikbaar.",
    },
    fr: {
      products: "Produits",
      activeInCatalog: (count: number) => `${count} actifs dans votre catalogue.`,
      customers: "Clients",
      customersDescription: "Entreprises avec coordonnees pour le suivi.",
      openOrders: "Commandes ouvertes",
      openOrdersDescription: "Commandes nouvelles, confirmees ou en traitement.",
      openRevenue: "Revenu ouvert",
      openRevenueDescription: "Valeur totale des commandes en cours.",
      recentOrders: "Commandes recentes",
      recentOrdersDescription: "Apercu rapide des dernieres commandes entrantes.",
      customer: "Client",
      status: "Statut",
      total: "Total",
      date: "Date",
      noOrders: "Aucune commande disponible pour le moment.",
    },
  } as const;

  return copy[locale];
}
