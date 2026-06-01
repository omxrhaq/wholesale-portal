import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, ShoppingCart, Users } from "lucide-react";

import {
  sendAdminCustomerPortalSetupEmailAction,
  setAdminCustomerActiveAction,
  setAdminProductActiveAction,
  updateAdminCustomerAction,
  updateAdminOrderStatusAction,
  updateAdminProductAction,
} from "@/app/admin/actions";
import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { ActivityHistory } from "@/components/activity/activity-history";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBanner } from "@/components/ui/status-banner";
import { formatCurrency, formatDate } from "@/lib/format";
import { getUserLocale } from "@/lib/i18n";
import { getAdminCopy, getCommonCopy } from "@/lib/i18n-copy";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getAdminCompanyWorkspace } from "@/lib/services/admin-service";
import { getAllowedNextOrderStatuses, getOrderStatusLabel } from "@/lib/orders";

type AdminCompanyPageProps = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function AdminCompanyPage({
  params,
  searchParams,
}: AdminCompanyPageProps) {
  await requireSuperAdmin();

  const { companyId } = await params;
  const { status, error } = await searchParams;
  const locale = await getUserLocale();
  const copy = getAdminCopy(locale);
  const common = getCommonCopy(locale);
  const workspace = await getAdminCompanyWorkspace(companyId);

  if (!workspace) {
    notFound();
  }

  const statusBanner = getSupportStatusBanner(copy, status, error);

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-[2rem] border border-border/70 bg-card/88 px-5 py-5 shadow-sm shadow-slate-950/4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
              {workspace.company.slug}
            </p>
            <h2 className="text-3xl font-semibold text-foreground">
              {workspace.company.name}
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">{copy.openWorkspace}</Link>
          </Button>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {copy.companyDetailDescription}
        </p>
      </div>

      {statusBanner ? <StatusBanner {...statusBanner} /> : null}

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-6">
        <MetricCard
          icon={Users}
          label={copy.totalCustomers}
          value={String(workspace.company.customerCount)}
          description={`${workspace.company.activeCustomerCount} ${copy.activeCustomers}`}
        />
        <MetricCard
          icon={Boxes}
          label={copy.totalProducts}
          value={String(workspace.company.productCount)}
          description={`${workspace.company.activeProductCount} ${copy.activeProducts}`}
        />
        <MetricCard
          icon={ShoppingCart}
          label={copy.totalOrders}
          value={String(workspace.company.orderCount)}
          description={`${workspace.company.openOrderCount} ${copy.openOrders}`}
        />
        <MetricCard
          icon={Users}
          label={copy.staff}
          value={String(workspace.company.staffCount)}
        />
        <MetricCard
          icon={Users}
          label={copy.buyers}
          value={String(workspace.company.buyerCount)}
        />
        <MetricCard
          icon={Users}
          label={copy.created}
          value={formatDate(workspace.company.createdAt, locale)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{copy.companyMembers}</CardTitle>
              <CardDescription>{copy.companyDetailDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {workspace.members.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={copy.noMembers}
                  description={copy.companyDetailDescription}
                  className="border-border/70 bg-card/88 py-14"
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/70">
                  <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
                    <thead className="bg-muted/70 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">{copy.actor}</th>
                        <th className="px-4 py-3 font-medium">{copy.role}</th>
                        <th className="px-4 py-3 font-medium">{copy.created}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {workspace.members.map((member) => (
                        <tr key={member.id} className="hover:bg-accent/45">
                          <td className="px-4 py-4">
                            <div className="font-medium text-foreground">
                              {member.fullName || member.email || member.userId}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {member.email || member.userId}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-foreground/80">{member.role}</td>
                          <td className="px-4 py-4 text-foreground/80">
                            {formatDate(member.createdAt, locale)}
                          </td>
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
              <CardTitle>{copy.customerSupport}</CardTitle>
              <CardDescription>{copy.companyDetailDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {workspace.customers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={copy.noCustomers}
                  description={copy.customerSupport}
                  className="border-border/70 bg-card/88 py-14"
                />
              ) : (
                <div className="space-y-3">
                  {workspace.customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="rounded-2xl border border-border/70 bg-card/88 px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{customer.name}</p>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>
                              {copy.loginEmail}: {customer.email ?? "-"}
                            </p>
                            <p>
                              {copy.status}: {customer.isActive ? common.active : common.inactive}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <form action={sendAdminCustomerPortalSetupEmailAction}>
                            <input type="hidden" name="companyId" value={workspace.company.id} />
                            <input type="hidden" name="customerId" value={customer.id} />
                            <Button
                              type="submit"
                              variant="outline"
                              disabled={!customer.email || !customer.isActive}
                            >
                              {copy.sendPasswordSetupEmail}
                            </Button>
                          </form>
                          <form action={setAdminCustomerActiveAction}>
                            <input type="hidden" name="companyId" value={workspace.company.id} />
                            <input type="hidden" name="customerId" value={customer.id} />
                            <input
                              type="hidden"
                              name="nextActive"
                              value={customer.isActive ? "false" : "true"}
                            />
                            <Button
                              type="submit"
                              variant={customer.isActive ? "destructive" : "secondary"}
                            >
                              {customer.isActive
                                ? copy.deactivateCustomer
                                : copy.reactivateCustomer}
                            </Button>
                          </form>
                        </div>
                      </div>
                      <details className="mt-4 rounded-xl border border-border/70 bg-muted/25 px-3 py-3">
                        <summary className="cursor-pointer text-sm font-medium text-foreground">
                          {copy.editCustomer}
                        </summary>
                        <form
                          action={updateAdminCustomerAction}
                          className="mt-4 grid gap-4 md:grid-cols-2"
                        >
                          <input type="hidden" name="companyId" value={workspace.company.id} />
                          <input type="hidden" name="customerId" value={customer.id} />
                          <div className="space-y-2">
                            <Label htmlFor={`customer-name-${customer.id}`}>{copy.name}</Label>
                            <Input
                              id={`customer-name-${customer.id}`}
                              name="name"
                              defaultValue={customer.name}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`customer-email-${customer.id}`}>{copy.loginEmail}</Label>
                            <Input
                              id={`customer-email-${customer.id}`}
                              name="email"
                              type="email"
                              defaultValue={customer.email ?? ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`customer-phone-${customer.id}`}>{copy.phone}</Label>
                            <Input
                              id={`customer-phone-${customer.id}`}
                              name="phone"
                              defaultValue={customer.phone ?? ""}
                            />
                          </div>
                          <label className="flex items-center gap-3 self-end rounded-lg border border-border/70 bg-background px-3 py-3 text-sm">
                            <input
                              type="checkbox"
                              name="isActive"
                              defaultChecked={customer.isActive}
                              className="size-4"
                            />
                            {copy.activeCustomer}
                          </label>
                          <div className="md:col-span-2">
                            <Button type="submit">{copy.saveChanges}</Button>
                          </div>
                        </form>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy.productCatalog}</CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.products.length === 0 ? (
                <EmptyState
                  icon={Boxes}
                  title={copy.noProducts}
                  description={copy.productCatalog}
                  className="border-border/70 bg-card/88 py-14"
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/70">
                  <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
                    <thead className="bg-muted/70 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">{copy.productCatalog}</th>
                        <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">{copy.status}</th>
                      <th className="px-4 py-3 font-medium">{copy.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {workspace.products.map((product) => (
                        <tr key={product.id} className="hover:bg-accent/45">
                          <td colSpan={4} className="px-4 py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="font-medium text-foreground">{product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {product.sku} / {product.categoryName ?? "-"} /{" "}
                                  {product.isActive ? common.active : common.inactive}
                                </div>
                              </div>
                              <form action={setAdminProductActiveAction}>
                                <input type="hidden" name="companyId" value={workspace.company.id} />
                                <input type="hidden" name="productId" value={product.id} />
                                <input
                                  type="hidden"
                                  name="nextActive"
                                  value={product.isActive ? "false" : "true"}
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant={product.isActive ? "destructive" : "secondary"}
                                >
                                  {product.isActive ? copy.deactivateProduct : copy.reactivateProduct}
                                </Button>
                              </form>
                            </div>
                            <details className="mt-3 rounded-xl border border-border/70 bg-muted/25 px-3 py-3">
                              <summary className="cursor-pointer text-sm font-medium text-foreground">
                                {copy.editProduct}
                              </summary>
                              <form
                                action={updateAdminProductAction}
                                className="mt-4 grid gap-4 md:grid-cols-2"
                              >
                                <input type="hidden" name="companyId" value={workspace.company.id} />
                                <input type="hidden" name="productId" value={product.id} />
                                <AdminInput label={copy.name} name="name" value={product.name} />
                                <AdminInput label="SKU" name="sku" value={product.sku} />
                                <AdminInput label={copy.category} name="categoryName" value={product.categoryName ?? ""} />
                                <AdminInput label={copy.unit} name="unit" value={product.unit} />
                                <AdminInput label={copy.price} name="price" value={String(product.price)} type="number" />
                                <div className="space-y-2 md:col-span-2">
                                  <Label>{copy.description}</Label>
                                  <Textarea name="description" defaultValue={product.description ?? ""} />
                                </div>
                                <label className="flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 text-sm">
                                  <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="size-4" />
                                  {copy.activeProduct}
                                </label>
                                <div className="self-end">
                                  <Button type="submit">{copy.saveChanges}</Button>
                                </div>
                              </form>
                            </details>
                          </td>
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
              <CardTitle>{copy.recentOrders}</CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.recentOrders.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title={copy.noOrders}
                  description={copy.recentOrders}
                  className="border-border/70 bg-card/88 py-14"
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/70">
                  <table className="min-w-full divide-y divide-border bg-card/90 text-sm">
                    <thead className="bg-muted/70 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">{copy.target}</th>
                        <th className="px-4 py-3 font-medium">{copy.status}</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                        <th className="px-4 py-3 font-medium">{copy.created}</th>
                        <th className="px-4 py-3 font-medium">{copy.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {workspace.recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-accent/45">
                          <td className="px-4 py-4">
                            <div className="font-medium text-foreground">
                              {order.customerName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.id.slice(0, 8).toUpperCase()}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <OrderStatusBadge status={order.status} locale={locale} />
                          </td>
                          <td className="px-4 py-4 text-foreground/80">
                            {formatCurrency(order.totalAmount, locale)}
                          </td>
                          <td className="px-4 py-4 text-foreground/80">
                            {formatDate(order.createdAt, locale)}
                          </td>
                          <td className="px-4 py-4">
                            {getAllowedNextOrderStatuses(order.status).length > 0 ? (
                              <form action={updateAdminOrderStatusAction} className="flex gap-2">
                                <input type="hidden" name="companyId" value={workspace.company.id} />
                                <input type="hidden" name="orderId" value={order.id} />
                                <select
                                  name="nextStatus"
                                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                                  defaultValue=""
                                  required
                                >
                                  <option value="" disabled>{copy.chooseStatus}</option>
                                  {getAllowedNextOrderStatuses(order.status).map((status) => (
                                    <option key={status} value={status}>
                                      {getOrderStatusLabel(status, locale)}
                                    </option>
                                  ))}
                                </select>
                                <Button type="submit" size="sm">{copy.updateStatus}</Button>
                              </form>
                            ) : (
                              <span className="text-xs text-muted-foreground">{copy.finalStatus}</span>
                            )}
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

        <div className="space-y-6 xl:sticky xl:top-6">
          <AdminAuditHistory
            entries={workspace.recentAdminActivity}
            locale={locale}
            title={copy.recentSupportTitle}
            description={copy.recentSupportDescription}
            emptyLabel={copy.noSupportActivity}
          />
          <ActivityHistory
            entries={workspace.recentTenantActivity}
            locale={locale}
            title={copy.tenantActivity}
            description={copy.tenantActivityDescription}
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
  description,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-5 text-primary" />
        </div>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {description ? (
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function getSupportStatusBanner(
  copy: ReturnType<typeof getAdminCopy>,
  status?: string,
  error?: string,
) {
  if (error) {
    return {
      variant: "error" as const,
      title: copy.supportActionFailed,
    };
  }

  if (!status) {
    return null;
  }

  if (status === "customer-deactivated") {
    return {
      variant: "success" as const,
      title: copy.statusCustomerDeactivated,
    };
  }

  if (status === "customer-reactivated") {
    return {
      variant: "success" as const,
      title: copy.statusCustomerReactivated,
    };
  }

  if (status === "portal-email-sent") {
    return {
      variant: "success" as const,
      title: copy.statusPortalEmailSent,
    };
  }

  if (status === "customer-updated") {
    return { variant: "success" as const, title: copy.statusCustomerUpdated };
  }

  if (status === "product-deactivated") {
    return { variant: "success" as const, title: copy.statusProductDeactivated };
  }

  if (status === "product-reactivated") {
    return { variant: "success" as const, title: copy.statusProductReactivated };
  }

  if (status === "product-updated") {
    return { variant: "success" as const, title: copy.statusProductUpdated };
  }

  if (status === "order-status-updated") {
    return { variant: "success" as const, title: copy.statusOrderUpdated };
  }

  return {
    variant: "info" as const,
    title: copy.statusUnknown,
  };
}

function AdminInput({
  label,
  name,
  value,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input name={name} type={type} defaultValue={value} step={type === "number" ? "0.01" : undefined} required />
    </div>
  );
}
