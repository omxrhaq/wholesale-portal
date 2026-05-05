import Link from "next/link";
import { KeyRound, Package2, ShoppingCart, Users } from "lucide-react";

import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { MobileDashboardNav } from "@/components/dashboard/mobile-dashboard-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireCompanyContext } from "@/lib/companies/context";
import { getCommonCopy, getDashboardNavCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getUserLocale();
  const nav = getDashboardNavCopy(locale);
  const common = getCommonCopy(locale);
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);
  const navLinks: DashboardNavLink[] = [
    { href: "/dashboard", icon: "overview", label: nav.overview },
    { href: "/dashboard/products", icon: "products", label: nav.products },
    { href: "/dashboard/orders", icon: "orders", label: nav.orders },
    { href: "/dashboard/customers", icon: "customers", label: nav.customers },
    { href: "/account/password", icon: "password", label: nav.password },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <div className="flex min-h-screen w-full flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-border/80 bg-card/84 px-5 py-4 shadow-sm shadow-slate-950/4 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
              {context.company.slug}
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              {context.company.name}
            </h1>
          </div>

          <MobileDashboardNav
            currentLocale={locale}
            copy={common}
            links={navLinks}
          />

          <div className="hidden flex-col gap-3 xl:flex xl:items-end">
            <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:flex-wrap xl:justify-end">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  icon={desktopNavIcons[link.icon]}
                  label={link.label}
                />
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <ThemeToggle
                label={common.theme}
                lightLabel={common.lightMode}
                darkLabel={common.darkMode}
                systemLabel={common.systemMode}
              />
              <LanguageSwitcher currentLocale={locale} />
              <LogoutButton />
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

type DashboardNavLink = {
  href: string;
  icon: "overview" | "products" | "orders" | "customers" | "password";
  label: string;
};

const desktopNavIcons: Record<DashboardNavLink["icon"], typeof Package2> = {
  overview: Package2,
  products: Package2,
  orders: ShoppingCart,
  customers: Users,
  password: KeyRound,
};

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
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border/80 bg-card/88 px-4 py-2 text-sm font-medium text-foreground/80 shadow-sm shadow-slate-950/4 transition hover:border-primary/20 hover:bg-accent hover:text-foreground sm:justify-start"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
