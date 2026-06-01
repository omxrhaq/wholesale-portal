import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, ShoppingCart, Users } from "lucide-react";

import { ActivityHistory } from "@/components/activity/activity-history";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminCompanyHeader } from "@/components/admin/admin-company-header";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import { getUserLocale } from "@/lib/i18n";
import { getAdminCopy } from "@/lib/i18n-copy";
import { getAdminCompanyWorkspace } from "@/lib/services/admin-service";

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const locale = await getUserLocale();
  const copy = getAdminCopy(locale);
  const workspace = await getAdminCompanyWorkspace(companyId);

  if (!workspace) notFound();

  return (
    <section className="space-y-6">
      <AdminCompanyHeader company={workspace.company} description={copy.companyDetailDescription} />

      <div className="grid gap-4 md:grid-cols-3">
        <ResourceCard
          href={`/admin/companies/${companyId}/customers`}
          icon={Users}
          label={copy.totalCustomers}
          value={workspace.company.customerCount}
          description={`${workspace.company.activeCustomerCount} ${copy.activeCustomers}`}
        />
        <ResourceCard
          href={`/admin/companies/${companyId}/products`}
          icon={Boxes}
          label={copy.totalProducts}
          value={workspace.company.productCount}
          description={`${workspace.company.activeProductCount} ${copy.activeProducts}`}
        />
        <ResourceCard
          href={`/admin/companies/${companyId}/orders`}
          icon={ShoppingCart}
          label={copy.totalOrders}
          value={workspace.company.orderCount}
          description={`${workspace.company.openOrderCount} ${copy.openOrders}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>{copy.recentOrders}</CardTitle>
                <CardDescription>{copy.companyDetailDescription}</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/companies/${companyId}/orders`}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {workspace.recentOrders.length === 0 ? (
                <EmptyState icon={ShoppingCart} title={copy.noOrders} description={copy.recentOrders} />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/70">
                  <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
                    <thead className="bg-muted/70 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Order</th>
                        <th className="px-4 py-3 font-medium">{copy.target}</th>
                        <th className="px-4 py-3 font-medium">{copy.status}</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {workspace.recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-4 font-medium">{order.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-4 py-4">{order.customerName}</td>
                          <td className="px-4 py-4"><OrderStatusBadge status={order.status} locale={locale} /></td>
                          <td className="px-4 py-4">{formatCurrency(order.totalAmount, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy.companyMembers}</CardTitle>
              <CardDescription>{workspace.company.staffCount} staff / {workspace.company.buyerCount} buyers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workspace.members.map((member) => (
                <div key={member.id} className="flex justify-between gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm">
                  <span>{member.fullName || member.email || member.userId}</span>
                  <span className="text-muted-foreground">{member.role}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <AdminAuditHistory entries={workspace.recentAdminActivity} locale={locale} title={copy.recentSupportTitle} description={copy.recentSupportDescription} emptyLabel={copy.noSupportActivity} />
          <ActivityHistory entries={workspace.recentTenantActivity} locale={locale} title={copy.tenantActivity} description={copy.tenantActivityDescription} emptyLabel={copy.noSupportActivity} />
        </div>
      </div>
    </section>
  );
}

function ResourceCard({ href, icon: Icon, label, value, description }: {
  href: string;
  icon: typeof Users;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition group-hover:border-primary/25 group-hover:bg-accent/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardDescription>{label}</CardDescription>
            <Icon className="size-5 text-primary" />
          </div>
          <CardTitle className="text-3xl">{value}</CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{description}</p></CardContent>
      </Card>
    </Link>
  );
}
