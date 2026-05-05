import { redirect } from "next/navigation";
import {
  Blocks,
  Building2,
  CheckCircle2,
  ClipboardList,
  ShoppingCart,
  Store,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentCompanyContext } from "@/lib/companies/context";
import { getUserLocale } from "@/lib/i18n";
import { getHomeCopy } from "@/lib/i18n-copy";

export default async function HomePage() {
  const locale = await getUserLocale();
  const t = getHomeCopy(locale);
  const context = await getCurrentCompanyContext();

  if (context) {
    redirect(context.companyUser.role === "buyer" ? "/portal" : "/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-8 text-slate-950 dark:text-foreground sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 premium-grid opacity-50" />
      <div className="pointer-events-none absolute left-[10%] top-20 size-64 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute right-[8%] top-36 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 left-1/3 size-72 rounded-full bg-accent/60 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8">
        <div className="premium-reveal flex justify-end">
          <LanguageSwitcher currentLocale={locale} />
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="premium-reveal flex flex-col justify-between rounded-[2rem] border border-border/80 bg-card/88 p-6 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/12 bg-primary/8 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-primary/85">
                <span className="inline-block size-1.5 rounded-full bg-primary" />
                {t.eyebrow}
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl xl:text-6xl">
                  {t.heroTitle}
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  {t.heroDescription}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <MetricCard
                label={t.featureCatalogTitle}
                value="01"
                text={t.featureCatalogText}
              />
              <MetricCard
                label={t.featureOrdersTitle}
                value="02"
                text={t.featureOrdersText}
              />
              <MetricCard
                label={t.featurePortalTitle}
                value="03"
                text={t.featurePortalText}
              />
            </div>
          </div>

          <div className="premium-float rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-slate-50 shadow-[0_36px_100px_-44px_rgba(15,23,42,0.95)] sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-blue-200/75">
                  {t.mockEyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {t.mockTitle}
                </h2>
              </div>
              <div className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-slate-200">
                {t.mockBadge}
              </div>
            </div>

            <div className="space-y-4 pt-5">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-sm font-medium text-white">{t.mockPanelTitle}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t.mockPanelText}
                    </p>
                  </div>
                  <div className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-100">
                    {t.mockToday}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <MockOrderRow
                    customer="Nordic Retail"
                    amount="€4,280"
                    status={t.mockStatusProcessing}
                  />
                  <MockOrderRow
                    customer="Maison Central"
                    amount="€1,940"
                    status={t.mockStatusConfirmed}
                  />
                  <MockOrderRow
                    customer="Studio Form"
                    amount="€6,150"
                    status={t.mockStatusNew}
                  />
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-sky-400/15 bg-sky-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-sky-200/75">
                  {t.mockSectionLabel}
                </p>
                <div className="mt-4 grid gap-2">
                  <StatusPill>{t.mockStatusNew}</StatusPill>
                  <StatusPill>{t.mockStatusConfirmed}</StatusPill>
                  <StatusPill>{t.mockStatusProcessing}</StatusPill>
                  <StatusPill>{t.mockStatusCompleted}</StatusPill>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-reveal">
          <div className="grid gap-3 rounded-[1.8rem] border border-border/80 bg-card/88 p-4 shadow-sm shadow-slate-950/4 backdrop-blur sm:grid-cols-3 sm:p-5">
            <TrustPill>{t.trustOne}</TrustPill>
            <TrustPill>{t.trustTwo}</TrustPill>
            <TrustPill>{t.trustThree}</TrustPill>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="premium-reveal overflow-hidden">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary/80">
                  {t.workflowTitle}
                </p>
                <h2 className="text-3xl font-semibold tracking-[-0.04em]">
                  {t.featureTitle}
                </h2>
                <p className="text-base leading-7 text-muted-foreground">
                  {t.workflowDescription}
                </p>
              </div>

              <div className="grid gap-4">
                <NarrativeRow
                  icon={Blocks}
                  title={t.workflowStepOneTitle}
                  text={t.workflowStepOneText}
                />
                <NarrativeRow
                  icon={ClipboardList}
                  title={t.workflowStepTwoTitle}
                  text={t.workflowStepTwoText}
                />
                <NarrativeRow
                  icon={Store}
                  title={t.workflowStepThreeTitle}
                  text={t.workflowStepThreeText}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <AudienceCard
              icon={Building2}
              title={t.audienceWholesalerTitle}
              text={t.audienceWholesalerText}
            />
            <AudienceCard
              icon={ShoppingCart}
              title={t.audienceBuyerTitle}
              text={t.audienceBuyerText}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-primary/75">
          {value}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function MockOrderRow({
  customer,
  amount,
  status,
}: {
  customer: string;
  amount: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/18 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-white">{customer}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          {status}
        </p>
      </div>
      <p className="text-sm font-semibold text-sky-100">{amount}</p>
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-xs text-slate-200">
      <CheckCircle2 className="size-3.5 text-sky-300" />
      {children}
    </div>
  );
}

function TrustPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/25 px-4 py-3 text-sm text-foreground">
      <CheckCircle2 className="size-4 text-primary" />
      {children}
    </div>
  );
}

function NarrativeRow({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Blocks;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/25 p-5">
      <div className="flex items-start gap-4">
        <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/12 bg-primary/8 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  );
}

function AudienceCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Building2;
  title: string;
  text: string;
}) {
  return (
    <Card className="premium-reveal h-full">
      <CardContent className="p-6">
        <div className="rounded-[1.65rem] border border-border/70 bg-muted/25 p-5">
          <div className="inline-flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-card/90 text-primary">
            <Icon className="size-5" />
          </div>
          <h3 className="mt-4 text-xl font-semibold">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}
