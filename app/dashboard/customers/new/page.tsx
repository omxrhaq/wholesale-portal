import { createCustomerAction } from "@/app/dashboard/customers/actions";
import { CustomerForm } from "@/components/customers/customer-form";
import { requireCompanyContext } from "@/lib/companies/context";
import { getCommonCopy, getCustomerCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function NewCustomerPage() {
  await requireCompanyContext(["wholesaler_owner", "wholesaler_staff"]);
  const locale = await getUserLocale();
  const copy = {
    ...getCommonCopy(locale),
    ...getCustomerCopy(locale),
  };

  return (
    <section className="w-full">
      <CustomerForm
        mode="create"
        submitAction={createCustomerAction}
        copy={copy}
      />
    </section>
  );
}
