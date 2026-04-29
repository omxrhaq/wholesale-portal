import { notFound } from "next/navigation";

import { updateProductCategoryAction } from "@/app/dashboard/products/categories/actions";
import { ProductCategoryForm } from "@/components/products/product-category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCompanyContext } from "@/lib/companies/context";
import {
  getCommonCopy,
  getProductCategoryCopy,
} from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { getProductCategoryById } from "@/lib/services/product-service";

export default async function EditProductCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);
  const locale = await getUserLocale();
  const copy = {
    ...getCommonCopy(locale),
    ...getProductCategoryCopy(locale),
  };
  const category = await getProductCategoryById(context.company.id, id);

  if (!category) {
    notFound();
  }

  const action = updateProductCategoryAction.bind(null, category.id);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{copy.categoryLinkedProducts}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          {category.productCount}
        </CardContent>
      </Card>

      <ProductCategoryForm
        mode="edit"
        initialValues={{
          name: category.name,
        }}
        submitAction={action}
        copy={copy}
      />
    </section>
  );
}
