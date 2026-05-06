import { notFound } from "next/navigation";

import { updateCustomerAction } from "@/app/dashboard/customers/actions";
import { ActivityHistory } from "@/components/activity/activity-history";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerPortalLoginForm } from "@/components/customers/customer-portal-login-form";
import { requireCompanyContext } from "@/lib/companies/context";
import { getCommonCopy, getCustomerCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { listActivityForEntity } from "@/lib/services/activity-log-service";
import { getCustomerById } from "@/lib/services/customer-service";

export default async function EditCustomerPage({
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
    ...getCustomerCopy(locale),
  };
  const [customer, activityEntries] = await Promise.all([
    getCustomerById(context.company.id, id),
    listActivityForEntity(context.company.id, "customer", id),
  ]);

  if (!customer) {
    notFound();
  }

  const action = updateCustomerAction.bind(null, customer.id);

  return (
    <section className="grid w-full gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <CustomerForm
        mode="edit"
        initialValues={{
          name: customer.name,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          isActive: customer.isActive,
        }}
        submitAction={action}
        copy={copy}
      />
      <div className="space-y-6">
        <CustomerPortalLoginForm
          customerId={customer.id}
          customerEmail={customer.email}
          isActive={customer.isActive}
          copy={copy}
        />
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
              ? "Nog geen geschiedenis voor deze klant."
              : locale === "fr"
                ? "Aucun historique pour ce client."
                : "No activity yet for this customer."
          }
        />
      </div>
    </section>
  );
}
