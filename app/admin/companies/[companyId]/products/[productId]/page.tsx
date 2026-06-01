import { notFound } from "next/navigation";

import { setAdminProductActiveAction, updateAdminProductAction } from "@/app/admin/actions";
import { AdminCompanyHeader } from "@/components/admin/admin-company-header";
import { AdminStatusBanner } from "@/components/admin/admin-status-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAdminCompanyDetail, getAdminProduct } from "@/lib/services/admin-service";

export default async function AdminProductDetailPage({ params, searchParams }: {
  params: Promise<{ companyId: string; productId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { companyId, productId } = await params;
  const query = await searchParams;
  const [company, product] = await Promise.all([getAdminCompanyDetail(companyId), getAdminProduct(companyId, productId)]);
  if (!company || !product) notFound();
  const returnTo = `/admin/companies/${companyId}/products/${productId}`;

  return (
    <section className="space-y-6">
      <AdminCompanyHeader company={company} description="Manage one catalog item without rendering the full product catalog." />
      <AdminStatusBanner status={query.status} error={query.error} />
      <Card>
        <CardHeader><CardTitle>{product.name}</CardTitle><CardDescription>{product.sku}</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <form action={updateAdminProductAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="productId" value={productId} /><input type="hidden" name="returnTo" value={returnTo} />
            <Field label="Name" name="name" value={product.name} />
            <Field label="SKU" name="sku" value={product.sku} />
            <Field label="Category" name="categoryName" value={product.categoryName ?? ""} />
            <Field label="Unit" name="unit" value={product.unit} />
            <Field label="Price" name="price" value={String(product.price)} type="number" />
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea name="description" defaultValue={product.description ?? ""} /></div>
            <label className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-3 text-sm"><input type="checkbox" name="isActive" defaultChecked={product.isActive} className="size-4" />Product is active</label>
            <div className="self-end"><Button>Save changes</Button></div>
          </form>
          <form action={setAdminProductActiveAction} className="border-t border-border/70 pt-5">
            <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="productId" value={productId} /><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="nextActive" value={product.isActive ? "false" : "true"} />
            <Button variant={product.isActive ? "destructive" : "secondary"}>{product.isActive ? "Deactivate product" : "Activate product"}</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function Field({ label, name, value, type = "text" }: { label: string; name: string; value: string; type?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input name={name} defaultValue={value} type={type} step={type === "number" ? "0.01" : undefined} required /></div>;
}
