import { StatusBanner } from "@/components/ui/status-banner";

const messages: Record<string, string> = {
  "customer-deactivated": "Customer deactivated.",
  "customer-reactivated": "Customer activated.",
  "customer-updated": "Customer updated.",
  "portal-email-sent": "Password setup email sent.",
  "product-deactivated": "Product deactivated.",
  "product-reactivated": "Product activated.",
  "product-updated": "Product updated.",
  "order-status-updated": "Order status updated.",
};

export function AdminStatusBanner({ status, error }: { status?: string; error?: string }) {
  if (error) return <StatusBanner variant="error" title="The admin action could not be completed." />;
  if (!status) return null;
  return <StatusBanner variant="success" title={messages[status] ?? "Action completed."} />;
}
