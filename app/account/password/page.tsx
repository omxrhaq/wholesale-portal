import Link from "next/link";

import { changePasswordAction } from "@/app/account/password/actions";
import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/session";
import { getCurrentCompanyContext } from "@/lib/companies/context";
import { getCommonCopy, getPasswordCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function AccountPasswordPage() {
  await requireAuthUser();

  const locale = await getUserLocale();
  const t = getPasswordCopy(locale);
  const common = getCommonCopy(locale);
  const context = await getCurrentCompanyContext();
  const isBuyer = context?.companyUser.role === "buyer";
  const backHref = isBuyer ? "/portal" : "/dashboard";
  const backLabel = isBuyer ? t.backToPortal : t.backToDashboard;

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md place-items-center">
        <Card className="w-full">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{t.changeTitle}</CardTitle>
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
            <CardDescription>{t.changeDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <PasswordUpdateForm
              action={changePasswordAction}
              loginType={isBuyer ? "buyer" : "wholesaler"}
              requireCurrentPassword
              copy={t}
            />
            <Link
              href={backHref}
              className="block text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {backLabel}
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
