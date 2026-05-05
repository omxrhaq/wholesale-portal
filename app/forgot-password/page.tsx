import Link from "next/link";

import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCommonCopy, getPasswordCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const loginType = params.type === "buyer" ? "buyer" : "wholesaler";
  const locale = await getUserLocale();
  const t = getPasswordCopy(locale);
  const common = getCommonCopy(locale);
  const backHref = loginType === "buyer" ? "/portal/login" : "/login";
  const backLabel =
    loginType === "buyer" ? t.backToBuyerLogin : t.backToWholesalerLogin;

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md place-items-center">
        <Card className="w-full">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{t.forgotTitle}</CardTitle>
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
            <CardDescription>{t.forgotDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ForgotPasswordForm
              action={requestPasswordResetAction}
              loginType={loginType}
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
