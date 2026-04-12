import { createProductAction } from "@/app/dashboard/products/actions";
import { ProductForm } from "@/components/products/product-form";
import { requireCompanyContext } from "@/lib/companies/context";
import { getCommonCopy, getProductCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function NewProductPage() {
  await requireCompanyContext(["wholesaler_owner", "wholesaler_staff"]);
  const locale = await getUserLocale();
  const copy = {
    ...getCommonCopy(locale),
    ...getProductCopy(locale),
  };

  return (
    <section className="mx-auto max-w-3xl">
      <ProductForm
        mode="create"
        submitAction={createProductAction}
        copy={copy}
      />
    </section>
  );
}
