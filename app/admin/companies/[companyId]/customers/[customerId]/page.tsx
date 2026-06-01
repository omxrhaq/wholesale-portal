import { notFound } from "next/navigation";

import { sendAdminCustomerPortalSetupEmailAction, setAdminCustomerActiveAction, updateAdminCustomerAction } from "@/app/admin/actions";
import { AdminCompanyHeader } from "@/components/admin/admin-company-header";
import { AdminStatusBanner } from "@/components/admin/admin-status-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdminCompanyDetail, getAdminCustomer } from "@/lib/services/admin-service";

export default async function AdminCustomerDetailPage({ params, searchParams }: {
  params: Promise<{ companyId: string; customerId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { companyId, customerId } = await params;
  const query = await searchParams;
  const [company, customer] = await Promise.all([getAdminCompanyDetail(companyId), getAdminCustomer(companyId, customerId)]);
  if (!company || !customer) notFound();
  const returnTo = `/admin/companies/${companyId}/customers/${customerId}`;

  return (
    <section className="space-y-6">
      <AdminCompanyHeader company={company} description="Manage one customer account and its buyer access." />
      <AdminStatusBanner status={query.status} error={query.error} />
      <Card>
        <CardHeader><CardTitle>{customer.name}</CardTitle><CardDescription>Customer account</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <form action={updateAdminCustomerAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="customerId" value={customerId} /><input type="hidden" name="returnTo" value={returnTo} />
            <Field label="Name" name="name" value={customer.name} />
            <Field label="Email" name="email" type="email" value={customer.email ?? ""} />
            <Field label="Phone" name="phone" value={customer.phone ?? ""} />
            <label className="flex items-center gap-3 self-end rounded-lg border border-border/70 px-3 py-3 text-sm"><input type="checkbox" name="isActive" defaultChecked={customer.isActive} className="size-4" />Customer is active</label>
            <div className="md:col-span-2"><Button>Save changes</Button></div>
          </form>
          <div className="flex flex-wrap gap-2 border-t border-border/70 pt-5">
            <form action={sendAdminCustomerPortalSetupEmailAction}>
              <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="customerId" value={customerId} /><input type="hidden" name="returnTo" value={returnTo} />
              <Button variant="outline" disabled={!customer.email || !customer.isActive}>Send password setup email</Button>
            </form>
            <form action={setAdminCustomerActiveAction}>
              <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="customerId" value={customerId} /><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="nextActive" value={customer.isActive ? "false" : "true"} />
              <Button variant={customer.isActive ? "destructive" : "secondary"}>{customer.isActive ? "Deactivate customer" : "Activate customer"}</Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Field({ label, name, value, type = "text" }: { label: string; name: string; value: string; type?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input name={name} defaultValue={value} type={type} /></div>;
}
