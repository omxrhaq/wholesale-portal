import { deactivateProductAction } from "@/app/dashboard/products/actions";
import { Button } from "@/components/ui/button";

export function DeactivateProductButton({
  productId,
  label,
}: {
  productId: string;
  label: string;
}) {
  const action = deactivateProductAction.bind(null, productId);

  return (
    <form action={action}>
      <Button type="submit" variant="outline" size="sm">
        {label}
      </Button>
    </form>
  );
}
