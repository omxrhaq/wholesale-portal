import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";

import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getAdminCopy, getCommonCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getUserLocale();
  const common = getCommonCopy(locale);
  const copy = getAdminCopy(locale);
  const admin = await requireSuperAdmin();
  const actorLabel = admin.profile.fullName || admin.profile.email || copy.platformLabel;

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <div className="flex min-h-screen w-full flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-border/80 bg-card/84 px-5 py-4 shadow-sm shadow-slate-950/4 backdrop-blur xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
              {copy.platformLabel}
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">/admin</h1>
              <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                {actorLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <nav className="flex flex-wrap gap-2 xl:justify-end">
              <AdminNavLink href="/admin" icon={ShieldCheck} label={copy.overview} />
              <AdminNavLink
                href="/admin#companies"
                icon={Building2}
                label={copy.companies}
              />
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

function AdminNavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof ShieldCheck;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border/80 bg-card/88 px-4 py-2 text-sm font-medium text-foreground/80 shadow-sm shadow-slate-950/4 transition hover:border-primary/20 hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
