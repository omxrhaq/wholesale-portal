import { createProductCategoryAction } from "@/app/dashboard/products/categories/actions";
import { ProductCategoryForm } from "@/components/products/product-category-form";
import {
  getCommonCopy,
  getProductCategoryCopy,
} from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function NewProductCategoryPage() {
  const locale = await getUserLocale();
  const copy = {
    ...getCommonCopy(locale),
    ...getProductCategoryCopy(locale),
  };

  return (
    <section className="mx-auto max-w-2xl">
      <ProductCategoryForm
        mode="create"
        submitAction={createProductCategoryAction}
        copy={copy}
      />
    </section>
  );
}
