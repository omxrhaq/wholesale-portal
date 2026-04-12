import { notFound } from "next/navigation";

import { updateProductAction } from "@/app/dashboard/products/actions";
import { ProductForm } from "@/components/products/product-form";
import { requireCompanyContext } from "@/lib/companies/context";
import { getCommonCopy, getProductCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { getProductById } from "@/lib/services/product-service";

export default async function EditProductPage({
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
    ...getProductCopy(locale),
  };
  const product = await getProductById(context.company.id, id);

  if (!product) {
    notFound();
  }

  const action = updateProductAction.bind(null, product.id);

  return (
    <section className="mx-auto max-w-3xl">
      <ProductForm
        mode="edit"
        initialValues={{
          name: product.name,
          sku: product.sku,
          description: product.description ?? "",
          unit: product.unit,
          price: product.price,
          isActive: product.isActive,
        }}
        submitAction={action}
        copy={copy}
      />
    </section>
  );
}
