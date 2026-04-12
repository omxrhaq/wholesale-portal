import Link from "next/link";
import { Package2, ShoppingCart, Users } from "lucide-react";

import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { requireCompanyContext } from "@/lib/companies/context";
import { getDashboardNavCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getUserLocale();
  const nav = getDashboardNavCopy(locale);
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f7f5ef_0%,_#f5efe4_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-border/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
              {context.company.slug}
            </p>
            <h1 className="text-2xl font-semibold text-slate-950">
              {context.company.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex flex-wrap gap-2">
              <NavLink href="/dashboard" icon={Package2} label={nav.overview} />
              <NavLink href="/dashboard/products" icon={Package2} label={nav.products} />
              <NavLink href="/dashboard/orders" icon={ShoppingCart} label={nav.orders} />
              <NavLink href="/dashboard/customers" icon={Users} label={nav.customers} />
            </nav>
            <LanguageSwitcher currentLocale={locale} />
            <LogoutButton />
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Package2;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
