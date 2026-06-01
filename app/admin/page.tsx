import Link from "next/link";
import { Building2, Boxes, ShoppingCart, Users } from "lucide-react";

import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { getUserLocale } from "@/lib/i18n";
import { getAdminCopy } from "@/lib/i18n-copy";
import {
  getAdminOverviewStats,
  listAdminCompanies,
} from "@/lib/services/admin-service";
import { listRecentAdminAudit } from "@/lib/services/admin-audit-service";

export default async function AdminPage() {
  const locale = await getUserLocale();
  const copy = getAdminCopy(locale);
  const [stats, companies, recentAdminAudit] = await Promise.all([
    getAdminOverviewStats(),
    listAdminCompanies(),
    listRecentAdminAudit(8),
  ]);

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-6">
        <MetricCard
          icon={Building2}
          label={copy.totalCompanies}
          value={String(stats.companyCount)}
        />
        <MetricCard
          icon={Users}
          label={copy.totalCustomers}
          value={String(stats.customerCount)}
        />
        <MetricCard
          icon={Boxes}
          label={copy.totalProducts}
          value={String(stats.productCount)}
        />
        <MetricCard
          icon={ShoppingCart}
          label={copy.totalOrders}
          value={String(stats.orderCount)}
        />
        <MetricCard icon={Users} label={copy.totalStaff} value={String(stats.staffCount)} />
        <MetricCard icon={Users} label={copy.totalBuyers} value={String(stats.buyerCount)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <Card id="companies">
          <CardHeader>
            <CardTitle>{copy.companyDirectoryTitle}</CardTitle>
            <CardDescription>{copy.companyDirectoryDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <EmptyState
                icon={Building2}
                title={copy.noCompanyFound}
                description={copy.companyDirectoryDescription}
                className="border-border/70 bg-card/88 py-14"
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/70">
                <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
                  <thead className="bg-muted/70 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">{copy.companies}</th>
                      <th className="px-4 py-3 font-medium">{copy.totalCustomers}</th>
                      <th className="px-4 py-3 font-medium">{copy.totalProducts}</th>
                      <th className="px-4 py-3 font-medium">{copy.totalOrders}</th>
                      <th className="px-4 py-3 font-medium">{copy.staff}</th>
                      <th className="px-4 py-3 font-medium">{copy.buyers}</th>
                      <th className="px-4 py-3 font-medium">{copy.created}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {companies.map((company) => (
                      <tr key={company.id} className="hover:bg-accent/45">
                        <td className="px-4 py-4">
                          <Link href={`/admin/companies/${company.id}`} className="block">
                            <div className="font-medium text-foreground">{company.name}</div>
                            <div className="text-xs text-muted-foreground">{company.slug}</div>
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-foreground/80">{company.customerCount}</td>
                        <td className="px-4 py-4 text-foreground/80">{company.productCount}</td>
                        <td className="px-4 py-4 text-foreground/80">{company.orderCount}</td>
                        <td className="px-4 py-4 text-foreground/80">{company.staffCount}</td>
                        <td className="px-4 py-4 text-foreground/80">{company.buyerCount}</td>
                        <td className="px-4 py-4 text-foreground/80">
                          {formatDate(company.createdAt, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="xl:sticky xl:top-6">
          <AdminAuditHistory
            entries={recentAdminAudit}
            locale={locale}
            title={copy.recentSupportTitle}
            description={copy.recentSupportDescription}
            emptyLabel={copy.noSupportActivity}
          />
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
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
    </Card>
  );
}
