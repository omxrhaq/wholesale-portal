"use client";

import Link from "next/link";
import { KeyRound, Menu, Package2, ShoppingCart, Users, X } from "lucide-react";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCommonCopy, type CopyLocale } from "@/lib/i18n-copy";
import { cn } from "@/lib/utils";

const navIcons = {
  overview: Package2,
  products: Package2,
  orders: ShoppingCart,
  customers: Users,
  password: KeyRound,
} as const;

export function MobileDashboardNav({
  currentLocale,
  copy,
  links,
}: {
  currentLocale: CopyLocale;
  copy: ReturnType<typeof getCommonCopy>;
  links: Array<{
    href: string;
    label: string;
    icon: keyof typeof navIcons;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={copy.menu}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-border/80 bg-card/88 px-4 py-2 text-sm font-medium text-foreground/80 shadow-sm shadow-slate-950/4 transition hover:border-primary/20 hover:bg-accent hover:text-foreground"
      >
        <span className="relative size-4">
          <Menu
            className={cn(
              "absolute inset-0 size-4 transition-all duration-200",
              isOpen ? "scale-75 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0",
            )}
          />
          <X
            className={cn(
              "absolute inset-0 size-4 transition-all duration-200",
              isOpen ? "scale-100 opacity-100 rotate-0" : "scale-75 opacity-0 -rotate-90",
            )}
          />
        </span>
        {copy.menu}
      </button>

      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isOpen
            ? "mt-3 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "rounded-2xl border border-border/80 bg-card/84 p-3 shadow-sm shadow-slate-950/4 backdrop-blur-sm transition-all duration-300 ease-out",
              isOpen ? "translate-y-0 scale-100" : "-translate-y-2 scale-[0.98]",
            )}
          >
            <nav className="grid grid-cols-2 gap-2">
              {links.map((link) => {
                const Icon = navIcons[link.icon];

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border/80 bg-card/88 px-4 py-2 text-sm font-medium text-foreground/80 shadow-sm shadow-slate-950/4 transition hover:border-primary/20 hover:bg-accent hover:text-foreground"
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ThemeToggle
                label={copy.theme}
                lightLabel={copy.lightMode}
                darkLabel={copy.darkMode}
                systemLabel={copy.systemMode}
              />
              <LanguageSwitcher currentLocale={currentLocale} />
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
