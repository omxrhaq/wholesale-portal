import { Building2, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { loginAction } from "@/app/login/actions";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/env";
import { getAuthCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; status?: string }>;
}) {
  const params = await searchParams;
  const isConfigured = hasSupabaseEnv();
  const locale = await getUserLocale();
  const t = getAuthCopy(locale);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.18),_transparent_35%),linear-gradient(180deg,_#fffaf1_0%,_#f7f2e8_48%,_#efe5d4_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-amber-950/10 bg-slate-950 px-8 py-10 text-white shadow-xl lg:px-12">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-amber-100">
              {t.heroLabel}
            </p>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {t.heroTitle}
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-300">
                {t.heroDescription}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Feature icon={Building2} title={t.featureCompanyTitle} text={t.featureCompanyText} />
            <Feature icon={ShieldCheck} title={t.featureAuthTitle} text={t.featureAuthText} />
            <Feature icon={KeyRound} title={t.featureMvpTitle} text={t.featureMvpText} />
          </div>
        </section>

        <section className="flex items-center">
          <Card className="w-full border-white/70 bg-white/90 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{t.title}</CardTitle>
                <LanguageSwitcher currentLocale={locale} />
              </div>
              <CardDescription>
                {t.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!isConfigured ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  {t.missingConfig}
                </div>
              ) : null}

              {params.error === "no-company" ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {t.noCompany}
                </div>
              ) : null}

              {params.status === "password-updated" ? (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {t.passwordUpdated}
                </div>
              ) : null}

              <LoginForm
                action={loginAction}
                next={params.next}
                copy={t}
                forgotPasswordHref="/forgot-password?type=wholesaler"
              />

              <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
                {t.switchToBuyerPrompt}{" "}
                <Link className="font-medium text-slate-950 underline-offset-4 hover:underline" href="/portal/login">
                  {t.switchToBuyerLink}
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Building2;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <Icon className="mb-3 size-5 text-amber-300" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}
