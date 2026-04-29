import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCompanyContext } from "@/lib/companies/context";
import { formatDate } from "@/lib/format";
import {
  getCommonCopy,
  getProductCategoryCopy,
} from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { listProductCategoriesOverview } from "@/lib/services/product-service";

type CategorySort =
  | "name_asc"
  | "name_desc"
  | "products_asc"
  | "products_desc"
  | "updated_asc"
  | "updated_desc";

export default async function ProductCategoriesPage({
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
  const t = getProductCategoryCopy(locale);
  const params = await searchParams;
  const selectedSort = isCategorySort(params.sort) ? params.sort : "name_asc";
  const categories = sortCategories(
    await listProductCategoriesOverview(context.company.id),
    selectedSort,
  );

  return (
    <section className="space-y-6">
      {params.status === "saved" ? (
        <p className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t.saved}
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>{t.manageCategories}</CardTitle>
            <CardDescription>{t.manageDescription}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/products">{t.backToProducts}</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/products/categories/new">{t.newCategory}</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                    label={t.assignedProducts}
                    params={params}
                    sortKey="products"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.updated}
                    params={params}
                    sortKey="updated"
                    activeSort={selectedSort}
                  />
                  <th className="px-4 py-3 text-right font-medium">{common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      {t.noCategories}
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-4 py-4 font-medium text-slate-950">
                        {category.name}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {category.productCount}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatDate(category.updatedAt, locale)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/products/categories/${category.id}/edit`}>
                              {common.edit}
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
  sortKey: "name" | "products" | "updated";
  activeSort: CategorySort;
}) {
  const isActive = activeSort.startsWith(`${sortKey}_`);
  const direction = isActive && activeSort.endsWith("_asc") ? "asc" : "desc";
  const indicator = isActive ? (direction === "asc" ? "↑" : "↓") : "↕";
  const nextSort = getNextSort(sortKey, activeSort);

  return (
    <th className="px-4 py-3 font-medium">
      <Link
        href={buildCategoriesUrl({ ...params, sort: nextSort })}
        className="inline-flex items-center gap-1 hover:text-slate-900"
      >
        {label}
        <span aria-hidden>{indicator}</span>
      </Link>
    </th>
  );
}

function buildCategoriesUrl(params: { sort?: string; status?: string }) {
  const search = new URLSearchParams();

  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }

  if (params.sort && params.sort !== "name_asc") {
    search.set("sort", params.sort);
  }

  const query = search.toString();
  return query ? `/dashboard/products/categories?${query}` : "/dashboard/products/categories";
}

function isCategorySort(value: string | undefined): value is CategorySort {
  if (!value) {
    return false;
  }

  return [
    "name_asc",
    "name_desc",
    "products_asc",
    "products_desc",
    "updated_asc",
    "updated_desc",
  ].includes(value);
}

function getNextSort(
  sortKey: "name" | "products" | "updated",
  activeSort: CategorySort,
) {
  const desc = `${sortKey}_desc` as CategorySort;
  const asc = `${sortKey}_asc` as CategorySort;

  if (activeSort === desc) {
    return asc;
  }

  return desc;
}

function sortCategories<
  T extends {
    name: string;
    productCount: number;
    updatedAt: Date;
  },
>(items: T[], sort: CategorySort) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return a.name.localeCompare(b.name, "en-US");
      case "name_desc":
        return b.name.localeCompare(a.name, "en-US");
      case "products_asc":
        return a.productCount - b.productCount;
      case "products_desc":
        return b.productCount - a.productCount;
      case "updated_asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "updated_desc":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  return sorted;
}
