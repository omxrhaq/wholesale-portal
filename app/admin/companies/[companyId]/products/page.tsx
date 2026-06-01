import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes } from "lucide-react";

import { AdminCompanyHeader } from "@/components/admin/admin-company-header";
import { AdminPagination, AdminSearch } from "@/components/admin/admin-list-controls";
import { AdminStatusBanner } from "@/components/admin/admin-status-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { getUserLocale } from "@/lib/i18n";
import { getAdminCompanyDetail, listAdminProducts } from "@/lib/services/admin-service";

export default async function AdminProductsPage({ params, searchParams }: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string; cursor?: string; direction?: "next" | "prev"; status?: string; error?: string }>;
}) {
  const { companyId } = await params;
  const queryParams = await searchParams;
  const query = queryParams.q?.trim() ?? "";
  const locale = await getUserLocale();
  const company = await getAdminCompanyDetail(companyId);
  if (!company) notFound();
  const products = await listAdminProducts({ companyId, query, cursor: queryParams.cursor, direction: queryParams.direction });
  const basePath = `/admin/companies/${companyId}/products`;

  return (
    <section className="space-y-6">
      <AdminCompanyHeader company={company} description="Search the catalog and open a single product when support work is required." />
      <AdminStatusBanner status={queryParams.status} error={queryParams.error} />
      <Card>
        <CardHeader><CardTitle>Products</CardTitle><CardDescription>{products.totalCount} matching products</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <AdminSearch action={basePath} query={query} placeholder="Search by product name or SKU" />
          {products.rows.length === 0 ? (
            <EmptyState icon={Boxes} title="No products found" description="Try another search term." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
                <thead className="bg-muted/70 text-left text-muted-foreground"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-border/70">
                  {products.rows.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-4 font-medium">{product.name}</td>
                      <td className="px-4 py-4 text-muted-foreground">{product.sku}</td>
                      <td className="px-4 py-4">{formatCurrency(product.price, locale)}</td>
                      <td className="px-4 py-4 text-muted-foreground">{formatDate(product.updatedAt, locale)}</td>
                      <td className="px-4 py-4 text-right"><Button asChild size="sm" variant="outline"><Link href={`${basePath}/${product.id}`}>Manage</Link></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AdminPagination basePath={basePath} query={query} previousCursor={products.previousCursor} nextCursor={products.nextCursor} />
        </CardContent>
      </Card>
    </section>
  );
}
