import Link from "next/link";
import { FileSpreadsheet, Plus } from "lucide-react";

import { DeactivateProductButton } from "@/components/products/deactivate-product-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCompanyContext } from "@/lib/companies/context";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCommonCopy, getProductCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { listProducts } from "@/lib/services/product-service";

type ProductSort =
  | "name_asc"
  | "name_desc"
  | "sku_asc"
  | "sku_desc"
  | "category_asc"
  | "category_desc"
  | "price_asc"
  | "price_desc"
  | "unit_asc"
  | "unit_desc"
  | "status_asc"
  | "status_desc"
  | "updated_asc"
  | "updated_desc";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);
  const locale = await getUserLocale();
  const common = getCommonCopy(locale);
  const t = getProductCopy(locale);
  const params = await searchParams;
  const selectedSort = isProductSort(params.sort) ? params.sort : "updated_desc";
  const products = sortProducts(
    await listProducts(context.company.id),
    selectedSort,
  );

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>{t.productManagement}</CardTitle>
            <CardDescription>
              {t.productDescription}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/products/import">
                <FileSpreadsheet className="size-4" />
                {t.excelImport}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/products/new">
                <Plus className="size-4" />
                {t.newProduct}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.status === "saved" ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {t.saved}
            </div>
          ) : null}

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
                    label="SKU"
                    params={params}
                    sortKey="sku"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.category}
                    params={params}
                    sortKey="category"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.price}
                    params={params}
                    sortKey="price"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.unit}
                    params={params}
                    sortKey="unit"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.status}
                    params={params}
                    sortKey="status"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.updated}
                    params={params}
                    sortKey="updated"
                    activeSort={selectedSort}
                  />
                  <th className="px-4 py-3 font-medium text-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      {t.noProducts}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{product.name}</div>
                        {product.description ? (
                          <p className="mt-1 max-w-md text-muted-foreground">
                            {product.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{product.sku}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {product.categoryName ?? t.uncategorized}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{formatCurrency(product.price, locale)}</td>
                      <td className="px-4 py-4 text-slate-700">{product.unit}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            product.isActive
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {product.isActive ? common.active : common.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatDate(product.updatedAt, locale)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/products/${product.id}/edit`}>
                              {common.edit}
                            </Link>
                          </Button>
                          {product.isActive ? (
                            <DeactivateProductButton
                              productId={product.id}
                              label={common.deactivate}
                            />
                          ) : null}
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
  params: { status?: string; sort?: string };
  sortKey: "name" | "sku" | "category" | "price" | "unit" | "status" | "updated";
  activeSort: ProductSort;
}) {
  const isActive = activeSort.startsWith(`${sortKey}_`);
  const direction = isActive && activeSort.endsWith("_asc") ? "asc" : "desc";
  const indicator = isActive ? (direction === "asc" ? "↑" : "↓") : "↕";
  const nextSort = getNextSort(sortKey, activeSort);

  return (
    <th className="px-4 py-3 font-medium">
      <Link
        href={buildProductsUrl({ ...params, sort: nextSort })}
        className="inline-flex items-center gap-1 hover:text-slate-900"
      >
        {label}
        <span aria-hidden>{indicator}</span>
      </Link>
    </th>
  );
}

function buildProductsUrl(params: { status?: string; sort?: string }) {
  const search = new URLSearchParams();

  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }

  if (params.sort && params.sort !== "updated_desc") {
    search.set("sort", params.sort);
  }

  const query = search.toString();
  return query ? `/dashboard/products?${query}` : "/dashboard/products";
}

function isProductSort(value: string | undefined): value is ProductSort {
  if (!value) {
    return false;
  }

  return [
    "name_asc",
    "name_desc",
    "sku_asc",
    "sku_desc",
    "category_asc",
    "category_desc",
    "price_asc",
    "price_desc",
    "unit_asc",
    "unit_desc",
    "status_asc",
    "status_desc",
    "updated_asc",
    "updated_desc",
  ].includes(value);
}

function getNextSort(
  sortKey: "name" | "sku" | "category" | "price" | "unit" | "status" | "updated",
  activeSort: ProductSort,
) {
  const desc = `${sortKey}_desc` as ProductSort;
  const asc = `${sortKey}_asc` as ProductSort;

  if (activeSort === desc) {
    return asc;
  }

  return desc;
}

function sortProducts<T extends {
  name: string;
  sku: string;
  categoryName: string | null;
  price: number;
  unit: string;
  isActive: boolean;
  updatedAt: Date;
}>(items: T[], sort: ProductSort) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return a.name.localeCompare(b.name, "en-US");
      case "name_desc":
        return b.name.localeCompare(a.name, "en-US");
      case "sku_asc":
        return a.sku.localeCompare(b.sku, "en-US");
      case "sku_desc":
        return b.sku.localeCompare(a.sku, "en-US");
      case "category_asc":
        return (a.categoryName ?? "").localeCompare(b.categoryName ?? "", "en-US");
      case "category_desc":
        return (b.categoryName ?? "").localeCompare(a.categoryName ?? "", "en-US");
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "unit_asc":
        return a.unit.localeCompare(b.unit, "en-US");
      case "unit_desc":
        return b.unit.localeCompare(a.unit, "en-US");
      case "status_asc":
        return Number(a.isActive) - Number(b.isActive);
      case "status_desc":
        return Number(b.isActive) - Number(a.isActive);
      case "updated_asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "updated_desc":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      default:
        return 0;
    }
  });

  return sorted;
}
