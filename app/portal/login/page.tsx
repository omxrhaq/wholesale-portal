import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import { portalLoginAction } from "@/app/portal/login/actions";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/env";
import { getAuthCopy, getCommonCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; status?: string }>;
}) {
  const params = await searchParams;
  const isConfigured = hasSupabaseEnv();
  const locale = await getUserLocale();
  const t = getAuthCopy(locale);
  const common = getCommonCopy(locale);

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl place-items-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="inline-flex items-center gap-2">
                <ShoppingCart className="size-5 text-primary" />
                {t.buyerTitle}
              </CardTitle>
              <div className="flex items-center gap-2">
                <ThemeToggle
                  label={common.theme}
                  lightLabel={common.lightMode}
                  darkLabel={common.darkMode}
                  systemLabel={common.systemMode}
                />
                <LanguageSwitcher currentLocale={locale} />
              </div>
            </div>
            <CardDescription>
              {t.buyerDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConfigured ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/30 dark:text-amber-100">
                {t.buyerMissingConfig}
              </div>
            ) : null}

            {params.error === "no-company" ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {t.noCompany}
              </div>
            ) : null}

            {params.error === "inactive-buyer" ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {t.inactiveBuyer}
              </div>
            ) : null}

            {params.status === "password-updated" ? (
              <div className="rounded-2xl border border-sky-200/90 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800/80 dark:bg-sky-950/35 dark:text-sky-100">
                {t.passwordUpdated}
              </div>
            ) : null}

            <LoginForm
              action={portalLoginAction}
              next={params.next}
              copy={t}
              forgotPasswordHref="/forgot-password?type=buyer"
            />

            <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
              {t.switchToWholesalerPrompt}{" "}
              <Link
                className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                href="/login"
              >
                {t.switchToWholesalerLink}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
