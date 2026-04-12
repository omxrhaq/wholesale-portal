import { setCustomerActiveAction } from "@/app/dashboard/customers/actions";
import { Button } from "@/components/ui/button";

export function CustomerActiveButton({
  customerId,
  isActive,
  deactivateLabel,
  reactivateLabel,
}: {
  customerId: string;
  isActive: boolean;
  deactivateLabel: string;
  reactivateLabel: string;
}) {
  const action = setCustomerActiveAction.bind(null, customerId, !isActive);

  return (
    <form action={action}>
      <Button type="submit" variant="outline" size="sm">
        {isActive ? deactivateLabel : reactivateLabel}
      </Button>
    </form>
  );
}
