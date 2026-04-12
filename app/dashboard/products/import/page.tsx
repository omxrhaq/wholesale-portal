import Link from "next/link";

import { ImportStatusBadge } from "@/components/imports/import-status-badge";
import { ProductImportForm } from "@/components/products/product-import-form";
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
import { getProductCopy, getProductImportCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { listImports } from "@/lib/services/import-service";

type ImportSort =
  | "file_asc"
  | "file_desc"
  | "status_asc"
  | "status_desc"
  | "total_asc"
  | "total_desc"
  | "imported_asc"
  | "imported_desc"
  | "failed_asc"
  | "failed_desc"
  | "created_asc"
  | "created_desc";

export default async function ProductImportPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);
  const locale = await getUserLocale();
  const t = {
    ...getProductImportCopy(locale),
    ...getProductCopy(locale),
  };
  const params = await searchParams;
  const selectedSort = isImportSort(params.sort) ? params.sort : "created_desc";
  const importHistory = sortImports(
    await listImports(context.company.id),
    selectedSort,
  );

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
            {t.productImport}
          </p>
          <h2 className="text-3xl font-semibold text-slate-950">
            {t.importExcelCatalog}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href="/dashboard/products/import/template">
              {t.downloadTemplate}
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/products">{t.backToProducts}</Link>
          </Button>
        </div>
      </div>

      <ProductImportForm copy={t} />

      <Card>
        <CardHeader>
          <CardTitle>{t.importHistory}</CardTitle>
          <CardDescription>
            {t.historyDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-border/70">
            <table className="min-w-full divide-y divide-border bg-white text-sm">
              <thead className="bg-slate-50/80 text-left text-slate-600">
                <tr>
                  <SortableHeader
                    label={t.file}
                    params={params}
                    sortKey="file"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.status}
                    params={params}
                    sortKey="status"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.totalRows}
                    params={params}
                    sortKey="total"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.imported}
                    params={params}
                    sortKey="imported"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.failed}
                    params={params}
                    sortKey="failed"
                    activeSort={selectedSort}
                  />
                  <SortableHeader
                    label={t.date}
                    params={params}
                    sortKey="created"
                    activeSort={selectedSort}
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {importHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {t.noImports}
                    </td>
                  </tr>
                ) : (
                  importHistory.map((importJob) => (
                    <tr key={importJob.id}>
                      <td className="px-4 py-4 font-medium text-slate-950">
                        {importJob.fileName}
                      </td>
                      <td className="px-4 py-4">
                        <ImportStatusBadge status={importJob.status} locale={locale} />
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {importJob.totalRows}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {importJob.importedRows}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {importJob.failedRows}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatDate(importJob.createdAt, locale)}
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
  params: { sort?: string };
  sortKey: "file" | "status" | "total" | "imported" | "failed" | "created";
  activeSort: ImportSort;
}) {
  const isActive = activeSort.startsWith(`${sortKey}_`);
  const direction = isActive && activeSort.endsWith("_asc") ? "asc" : "desc";
  const indicator = isActive ? (direction === "asc" ? "↑" : "↓") : "↕";
  const nextSort = getNextSort(sortKey, activeSort);

  return (
    <th className="px-4 py-3 font-medium">
      <Link
        href={buildImportsUrl({ ...params, sort: nextSort })}
        className="inline-flex items-center gap-1 hover:text-slate-900"
      >
        {label}
        <span aria-hidden>{indicator}</span>
      </Link>
    </th>
  );
}

function buildImportsUrl(params: { sort?: string }) {
  const search = new URLSearchParams();

  if (params.sort && params.sort !== "created_desc") {
    search.set("sort", params.sort);
  }

  const query = search.toString();
  return query ? `/dashboard/products/import?${query}` : "/dashboard/products/import";
}

function isImportSort(value: string | undefined): value is ImportSort {
  if (!value) {
    return false;
  }

  return [
    "file_asc",
    "file_desc",
    "status_asc",
    "status_desc",
    "total_asc",
    "total_desc",
    "imported_asc",
    "imported_desc",
    "failed_asc",
    "failed_desc",
    "created_asc",
    "created_desc",
  ].includes(value);
}

function getNextSort(
  sortKey: "file" | "status" | "total" | "imported" | "failed" | "created",
  activeSort: ImportSort,
) {
  const desc = `${sortKey}_desc` as ImportSort;
  const asc = `${sortKey}_asc` as ImportSort;

  if (activeSort === desc) {
    return asc;
  }

  return desc;
}

function sortImports<T extends {
  fileName: string;
  status: string;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  createdAt: Date;
}>(items: T[], sort: ImportSort) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "file_asc":
        return a.fileName.localeCompare(b.fileName, "en-US");
      case "file_desc":
        return b.fileName.localeCompare(a.fileName, "en-US");
      case "status_asc":
        return a.status.localeCompare(b.status, "en-US");
      case "status_desc":
        return b.status.localeCompare(a.status, "en-US");
      case "total_asc":
        return a.totalRows - b.totalRows;
      case "total_desc":
        return b.totalRows - a.totalRows;
      case "imported_asc":
        return a.importedRows - b.importedRows;
      case "imported_desc":
        return b.importedRows - a.importedRows;
      case "failed_asc":
        return a.failedRows - b.failedRows;
      case "failed_desc":
        return b.failedRows - a.failedRows;
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
