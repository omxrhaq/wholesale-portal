import { createProductAction } from "@/app/dashboard/products/actions";
import { ProductForm } from "@/components/products/product-form";
import { requireCompanyContext } from "@/lib/companies/context";
import { getCommonCopy, getProductCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { listProductCategories } from "@/lib/services/product-service";

export default async function NewProductPage() {
  const context = await requireCompanyContext(["wholesaler_owner", "wholesaler_staff"]);
  const locale = await getUserLocale();
  const categories = await listProductCategories(context.company.id);
  const copy = {
    ...getCommonCopy(locale),
    ...getProductCopy(locale),
  };

  return (
    <section className="w-full">
      <ProductForm
        mode="create"
        categoryNames={categories.map((category) => category.name)}
        submitAction={createProductAction}
        copy={copy}
      />
    </section>
  );
}
