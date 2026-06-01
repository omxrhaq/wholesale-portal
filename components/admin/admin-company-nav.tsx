import Link from "next/link";
import { Boxes, Building2, ShoppingCart, Users } from "lucide-react";

const items = [
  { segment: "", label: "Overview", icon: Building2 },
  { segment: "customers", label: "Customers", icon: Users },
  { segment: "products", label: "Products", icon: Boxes },
  { segment: "orders", label: "Orders", icon: ShoppingCart },
];

export function AdminCompanyNav({ companyId }: { companyId: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map(({ segment, label, icon: Icon }) => (
        <Link
          key={segment}
          href={`/admin/companies/${companyId}${segment ? `/${segment}` : ""}`}
          className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/88 px-3 py-2 text-sm font-medium text-foreground/80 transition hover:border-primary/20 hover:bg-accent hover:text-foreground"
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
