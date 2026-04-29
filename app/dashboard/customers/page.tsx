import Link from "next/link";
import { Users } from "lucide-react";

import { CustomerActiveButton } from "@/components/customers/customer-active-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBanner } from "@/components/ui/status-banner";
import { requireCompanyContext } from "@/lib/companies/context";
import { formatDate } from "@/lib/format";
import { getCommonCopy, getCustomerCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { listCustomers } from "@/lib/services/customer-service";

type CustomerSort =
  | "name_asc"
  | "name_desc"
  | "email_asc"
  | "email_desc"
  | "phone_asc"
  | "phone_desc"
  | "status_asc"
  | "status_desc"
  | "created_asc"
  | "created_desc";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; status?: string }>;
}) {
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);
  const locale = await getUserLocale();
  const common = getCommonCopy(locale);
  const t = getCustomerCopy(locale);
  const params = await searchParams;
  const selectedSort = isCustomerSort(params.sort) ? params.sort : "name_asc";
  const customers = sortCustomers(
    await listCustomers(context.company.id),
    selectedSort,
  );

  return (
    <section className="space-y-6">
      {params.status === "saved" ? (
        <StatusBanner
          variant="success"
          title={t.saved}
          description={t.overviewDescription}
        />
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>{t.customers}</CardTitle>
            <CardDescription>{t.overviewDescription}</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/customers/new">{t.newCustomer}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t.noCustomers}
              description={t.overviewDescription}
              className="border-border/70 bg-white/90 py-14"
              actions={
                <Button asChild>
                  <Link href="/dashboard/customers/new">{t.newCustomer}</Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <table className="min-w-full divide-y divide-border bg-white text-sm">
                <thead className="bg-slate-50/80 text-left text-slate-600">
                  <tr>
                    <SortableHeader
                      label={t.name}
                      params={params}
                      sortKey="name"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.email}
                      params={params}
                      sortKey="email"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.phone}
                      params={params}
                      sortKey="phone"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.status}
                      params={params}
                      sortKey="status"
                      activeSort={selectedSort}
                    />
                    <SortableHeader
                      label={t.created}
                      params={params}
                      sortKey="created"
                      activeSort={selectedSort}
                    />
                    <th className="px-4 py-3 font-medium text-right">{common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-4 py-4 font-medium text-slate-950">
                        {customer.name}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {customer.email ?? t.noEmail}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {customer.phone ?? t.noPhone}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            customer.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {customer.isActive ? common.active : common.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatDate(customer.createdAt, locale)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/customers/${customer.id}/edit`}>
                              {common.edit}
                            </Link>
                          </Button>
                          <CustomerActiveButton
                            customerId={customer.id}
                            isActive={customer.isActive}
                            deactivateLabel={common.deactivate}
                            reactivateLabel={common.reactivate}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function SortableHeader({
  label,
  params,
  sortKey,
  activeSort,
}: {
  label: string;
  params: { sort?: string; status?: string };
  sortKey: "name" | "email" | "phone" | "status" | "created";
  activeSort: CustomerSort;
}) {
  const isActive = activeSort.startsWith(`${sortKey}_`);
  const direction = isActive && activeSort.endsWith("_asc") ? "asc" : "desc";
  const indicator = isActive ? (direction === "asc" ? "↑" : "↓") : "↕";
  const nextSort = getNextSort(sortKey, activeSort);

  return (
    <th className="px-4 py-3 font-medium">
      <Link
        href={buildCustomersUrl({ ...params, sort: nextSort })}
        className="inline-flex items-center gap-1 hover:text-slate-900"
      >
        {label}
        <span aria-hidden>{indicator}</span>
      </Link>
    </th>
  );
}

function buildCustomersUrl(params: { sort?: string; status?: string }) {
  const search = new URLSearchParams();

  if (params.sort && params.sort !== "name_asc") {
    search.set("sort", params.sort);
  }

  const query = search.toString();
  return query ? `/dashboard/customers?${query}` : "/dashboard/customers";
}

function isCustomerSort(value: string | undefined): value is CustomerSort {
  if (!value) {
    return false;
  }

  return [
    "name_asc",
    "name_desc",
    "email_asc",
    "email_desc",
    "phone_asc",
    "phone_desc",
    "status_asc",
    "status_desc",
    "created_asc",
    "created_desc",
  ].includes(value);
}

function getNextSort(
  sortKey: "name" | "email" | "phone" | "status" | "created",
  activeSort: CustomerSort,
) {
  const desc = `${sortKey}_desc` as CustomerSort;
  const asc = `${sortKey}_asc` as CustomerSort;

  if (activeSort === desc) {
    return asc;
  }

  return desc;
}

function sortCustomers<T extends {
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
}>(items: T[], sort: CustomerSort) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return a.name.localeCompare(b.name, "en-US");
      case "name_desc":
        return b.name.localeCompare(a.name, "en-US");
      case "email_asc":
        return (a.email ?? "").localeCompare(b.email ?? "", "en-US");
      case "email_desc":
        return (b.email ?? "").localeCompare(a.email ?? "", "en-US");
      case "phone_asc":
        return (a.phone ?? "").localeCompare(b.phone ?? "", "en-US");
      case "phone_desc":
        return (b.phone ?? "").localeCompare(a.phone ?? "", "en-US");
      case "status_asc":
        return Number(a.isActive) - Number(b.isActive);
      case "status_desc":
        return Number(b.isActive) - Number(a.isActive);
      case "created_asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "created_desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  return sorted;
}
