import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import { portalLoginAction } from "@/app/portal/login/actions";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/env";
import { getAuthCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const isConfigured = hasSupabaseEnv();
  const locale = await getUserLocale();
  const t = getAuthCopy(locale);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.14),_transparent_35%),linear-gradient(180deg,_#f5fbfa_0%,_#ecf7f5_45%,_#e6f0ed_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl place-items-center">
        <Card className="w-full max-w-md border-white/70 bg-white/90 backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="inline-flex items-center gap-2">
                <ShoppingCart className="size-5 text-teal-700" />
                {t.buyerTitle}
              </CardTitle>
              <LanguageSwitcher currentLocale={locale} />
            </div>
            <CardDescription>
              {t.buyerDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConfigured ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
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

            <LoginForm action={portalLoginAction} next={params.next} copy={t} />

            <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
              {t.switchToWholesalerPrompt}{" "}
              <Link className="font-medium text-slate-950 underline-offset-4 hover:underline" href="/login">
                {t.switchToWholesalerLink}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
