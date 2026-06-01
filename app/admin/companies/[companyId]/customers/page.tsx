import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";

import { AdminCompanyHeader } from "@/components/admin/admin-company-header";
import { AdminPagination, AdminSearch } from "@/components/admin/admin-list-controls";
import { AdminStatusBanner } from "@/components/admin/admin-status-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { getUserLocale } from "@/lib/i18n";
import { getAdminCopy, getCommonCopy } from "@/lib/i18n-copy";
import { getAdminCompanyDetail, listAdminCustomers } from "@/lib/services/admin-service";

export default async function AdminCustomersPage({ params, searchParams }: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string; cursor?: string; direction?: "next" | "prev"; status?: string; error?: string }>;
}) {
  const { companyId } = await params;
  const queryParams = await searchParams;
  const query = queryParams.q?.trim() ?? "";
  const locale = await getUserLocale();
  const copy = getAdminCopy(locale);
  const common = getCommonCopy(locale);
  const company = await getAdminCompanyDetail(companyId);
  if (!company) notFound();
  const customers = await listAdminCustomers({ companyId, query, cursor: queryParams.cursor, direction: queryParams.direction });
  const basePath = `/admin/companies/${companyId}/customers`;

  return (
    <section className="space-y-6">
      <AdminCompanyHeader company={company} description="Search and manage customer accounts without loading the full tenant directory." />
      <AdminStatusBanner status={queryParams.status} error={queryParams.error} />
      <Card>
        <CardHeader>
          <CardTitle>{copy.totalCustomers}</CardTitle>
          <CardDescription>{customers.totalCount} matching customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <AdminSearch action={basePath} query={query} placeholder="Search by name, email or phone" />
          {customers.rows.length === 0 ? (
            <EmptyState icon={Users} title={copy.noCustomers} description="Try another search term." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
                <thead className="bg-muted/70 text-left text-muted-foreground">
                  <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {customers.rows.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-4 py-4 font-medium">{customer.name}</td>
                      <td className="px-4 py-4 text-muted-foreground">{customer.email ?? "-"}</td>
                      <td className="px-4 py-4">{customer.isActive ? common.active : common.inactive}</td>
                      <td className="px-4 py-4 text-muted-foreground">{formatDate(customer.createdAt, locale)}</td>
                      <td className="px-4 py-4 text-right"><Button asChild size="sm" variant="outline"><Link href={`${basePath}/${customer.id}`}>Manage</Link></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AdminPagination basePath={basePath} query={query} previousCursor={customers.previousCursor} nextCursor={customers.nextCursor} />
        </CardContent>
      </Card>
    </section>
  );
}
