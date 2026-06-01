import { notFound } from "next/navigation";
import { ShoppingCart } from "lucide-react";

import { updateAdminOrderStatusAction } from "@/app/admin/actions";
import { AdminCompanyHeader } from "@/components/admin/admin-company-header";
import { AdminPagination, AdminSearch } from "@/components/admin/admin-list-controls";
import { AdminStatusBanner } from "@/components/admin/admin-status-banner";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { getUserLocale } from "@/lib/i18n";
import { getAllowedNextOrderStatuses, getOrderStatusLabel } from "@/lib/orders";
import { getAdminCompanyDetail, listAdminOrders } from "@/lib/services/admin-service";

export default async function AdminOrdersPage({ params, searchParams }: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string; cursor?: string; direction?: "next" | "prev"; status?: string; error?: string }>;
}) {
  const { companyId } = await params;
  const queryParams = await searchParams;
  const query = queryParams.q?.trim() ?? "";
  const locale = await getUserLocale();
  const company = await getAdminCompanyDetail(companyId);
  if (!company) notFound();
  const orders = await listAdminOrders({ companyId, query, cursor: queryParams.cursor, direction: queryParams.direction });
  const basePath = `/admin/companies/${companyId}/orders`;

  return (
    <section className="space-y-6">
      <AdminCompanyHeader company={company} description="Search orders and process status transitions one bounded page at a time." />
      <AdminStatusBanner status={queryParams.status} error={queryParams.error} />
      <Card>
        <CardHeader><CardTitle>Orders</CardTitle><CardDescription>{orders.totalCount} matching orders</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <AdminSearch action={basePath} query={query} placeholder="Search by customer, email or order id" />
          {orders.rows.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="No orders found" description="Try another search term." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70">
              <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
                <thead className="bg-muted/70 text-left text-muted-foreground"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Actions</th></tr></thead>
                <tbody className="divide-y divide-border/70">
                  {orders.rows.map((order) => {
                    const transitions = getAllowedNextOrderStatuses(order.status);
                    return (
                      <tr key={order.id}>
                        <td className="px-4 py-4 font-medium">{order.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-4">{order.customerName}</td>
                        <td className="px-4 py-4"><OrderStatusBadge status={order.status} locale={locale} /></td>
                        <td className="px-4 py-4">{formatCurrency(order.totalAmount, locale)}</td>
                        <td className="px-4 py-4 text-muted-foreground">{formatDate(order.createdAt, locale)}</td>
                        <td className="px-4 py-4">
                          {transitions.length ? (
                            <form action={updateAdminOrderStatusAction} className="flex gap-2">
                              <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="returnTo" value={basePath} />
                              <select name="nextStatus" defaultValue="" required className="h-8 rounded-lg border border-border bg-background px-2 text-sm">
                                <option value="" disabled>Choose status</option>
                                {transitions.map((status) => <option key={status} value={status}>{getOrderStatusLabel(status, locale)}</option>)}
                              </select>
                              <Button size="sm">Update</Button>
                            </form>
                          ) : <span className="text-xs text-muted-foreground">Final status</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <AdminPagination basePath={basePath} query={query} previousCursor={orders.previousCursor} nextCursor={orders.nextCursor} />
        </CardContent>
      </Card>
    </section>
  );
}
