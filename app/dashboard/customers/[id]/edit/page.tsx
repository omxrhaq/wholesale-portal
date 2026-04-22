import { notFound } from "next/navigation";

import { updateCustomerAction } from "@/app/dashboard/customers/actions";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerPortalLoginForm } from "@/components/customers/customer-portal-login-form";
import { requireCompanyContext } from "@/lib/companies/context";
import { getCommonCopy, getCustomerCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
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
  const customer = await getCustomerById(context.company.id, id);

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
      <CustomerPortalLoginForm
        customerId={customer.id}
        customerEmail={customer.email}
        isActive={customer.isActive}
        copy={copy}
      />
    </section>
  );
}
