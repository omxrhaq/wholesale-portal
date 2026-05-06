import { notFound } from "next/navigation";

import { updateProductAction } from "@/app/dashboard/products/actions";
import { ActivityHistory } from "@/components/activity/activity-history";
import { ProductForm } from "@/components/products/product-form";
import { requireCompanyContext } from "@/lib/companies/context";
import { getCommonCopy, getProductCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { listActivityForEntity } from "@/lib/services/activity-log-service";
import { getProductById, listProductCategories } from "@/lib/services/product-service";

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
  const [product, categories, activityEntries] = await Promise.all([
    getProductById(context.company.id, id),
    listProductCategories(context.company.id),
    listActivityForEntity(context.company.id, "product", id),
  ]);

  if (!product) {
    notFound();
  }

  const action = updateProductAction.bind(null, product.id);

  return (
    <section className="grid w-full gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <ProductForm
        mode="edit"
        initialValues={{
          name: product.name,
          sku: product.sku,
          categoryName: product.categoryName ?? "",
          description: product.description ?? "",
          unit: product.unit,
          price: product.price,
          isActive: product.isActive,
        }}
        categoryNames={categories.map((category) => category.name)}
        submitAction={action}
        copy={copy}
      />
      <div className="space-y-6">
        <ActivityHistory
          entries={activityEntries}
          locale={locale}
          title={locale === "nl" ? "Geschiedenis" : locale === "fr" ? "Historique" : "Activity history"}
          description={
            locale === "nl"
              ? "Bekijk recente wijzigingen wanneer nodig."
              : locale === "fr"
                ? "Consultez les dernieres modifications si necessaire."
                : "Review recent changes only when needed."
          }
          emptyLabel={
            locale === "nl"
              ? "Nog geen geschiedenis voor dit product."
              : locale === "fr"
                ? "Aucun historique pour ce produit."
                : "No activity yet for this product."
          }
        />
      </div>
    </section>
  );
}
