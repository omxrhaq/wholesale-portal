import { Building2, CheckCircle2, Store } from "lucide-react";
import { redirect } from "next/navigation";

import { selectCompanyAction, type CompanyAccessMode } from "@/app/actions/company";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/session";
import {
  listCurrentUserCompanyMemberships,
  type CompanyMembershipSummary,
} from "@/lib/companies/context";
import { getCommonCopy, getCompanyCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { getActivePortalCustomer } from "@/lib/services/portal-access-service";

const dashboardRoles = ["wholesaler_owner", "wholesaler_staff"] as const;
const portalRoles = ["buyer", "wholesaler_owner", "wholesaler_staff"] as const;

function getSafeMode(mode: string | undefined): CompanyAccessMode {
  return mode === "portal" ? "portal" : "dashboard";
}

function getSafeNextPath(mode: CompanyAccessMode, nextPath: string | undefined) {
  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    return nextPath;
  }

  return mode === "portal" ? "/portal" : "/dashboard";
}

async function filterPortalMemberships(
  memberships: CompanyMembershipSummary[],
  userId: string,
) {
  const buyerChecks = await Promise.all(
    memberships.map(async (membership) => {
      if (membership.role !== "buyer") {
        return membership;
      }

      const customer = await getActivePortalCustomer(
        membership.companyId,
        userId,
      );

      return customer ? membership : null;
    }),
  );

  return buyerChecks.filter((membership) => membership !== null);
}

export default async function SelectCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const params = await searchParams;
  const mode = getSafeMode(params.mode);
  const nextPath = getSafeNextPath(mode, params.next);
  const locale = await getUserLocale();
  const common = getCommonCopy(locale);
  const copy = getCompanyCopy(locale);
  const user = await requireAuthUser();

  let memberships = await listCurrentUserCompanyMemberships(
    mode === "portal" ? [...portalRoles] : [...dashboardRoles],
  );

  if (mode === "portal") {
    memberships = await filterPortalMemberships(memberships, user.id);
  }

  if (memberships.length === 0) {
    redirect(mode === "portal" ? "/portal/login?error=no-company" : "/login?error=no-company");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-primary/10 bg-slate-900 px-8 py-10 text-white shadow-xl shadow-slate-950/12 dark:bg-slate-950 lg:px-12">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm text-blue-100">
              {copy.company}
            </p>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {copy.chooseCompanyTitle}
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-300">
                {mode === "portal"
                  ? copy.choosePortalCompanyDescription
                  : copy.chooseDashboardCompanyDescription}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Feature
              icon={Building2}
              title={copy.company}
              text={copy.companySelectionFeature}
            />
            <Feature
              icon={Store}
              title={copy.workspace}
              text={copy.workspaceSelectionFeature}
            />
            <Feature
              icon={CheckCircle2}
              title={copy.security}
              text={copy.securitySelectionFeature}
            />
          </div>
        </section>

        <section className="flex items-center">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{copy.chooseCompanyTitle}</CardTitle>
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
                {mode === "portal"
                  ? copy.choosePortalCompanyDescription
                  : copy.chooseDashboardCompanyDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {memberships.map((membership) => (
                <form key={membership.companyId} action={selectCompanyAction}>
                  <input type="hidden" name="companyId" value={membership.companyId} />
                  <input type="hidden" name="mode" value={mode} />
                  <input type="hidden" name="next" value={nextPath} />
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-auto w-full justify-between rounded-[1.5rem] px-5 py-4 text-left"
                  >
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">
                        {membership.companyName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {membership.companySlug}
                      </p>
                    </div>
                    <span className="rounded-full border border-border/80 bg-background/85 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {copy.roleLabels[membership.role]}
                    </span>
                  </Button>
                </form>
              ))}
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
      <Icon className="mb-3 size-5 text-blue-200" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}
