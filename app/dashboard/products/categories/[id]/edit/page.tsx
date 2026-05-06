import { notFound } from "next/navigation";

import { updateProductCategoryAction } from "@/app/dashboard/products/categories/actions";
import { ActivityHistory } from "@/components/activity/activity-history";
import { ProductCategoryForm } from "@/components/products/product-category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCompanyContext } from "@/lib/companies/context";
import {
  getCommonCopy,
  getProductCategoryCopy,
} from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { listActivityForEntity } from "@/lib/services/activity-log-service";
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
  const [category, activityEntries] = await Promise.all([
    getProductCategoryById(context.company.id, id),
    listActivityForEntity(context.company.id, "product_category", id),
  ]);

  if (!category) {
    notFound();
  }

  const action = updateProductCategoryAction.bind(null, category.id);

  return (
    <section className="grid w-full gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{copy.categoryLinkedProducts}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/80">
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
      </div>
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
              ? "Nog geen geschiedenis voor deze categorie."
              : locale === "fr"
                ? "Aucun historique pour cette categorie."
                : "No activity yet for this category."
          }
        />
      </div>
    </section>
  );
}
