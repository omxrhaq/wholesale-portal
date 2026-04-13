import Link from "next/link";

import { changePasswordAction } from "@/app/account/password/actions";
import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/session";
import { getCurrentCompanyContext } from "@/lib/companies/context";
import { getPasswordCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function AccountPasswordPage() {
  await requireAuthUser();

  const locale = await getUserLocale();
  const t = getPasswordCopy(locale);
  const context = await getCurrentCompanyContext();
  const isBuyer = context?.companyUser.role === "buyer";
  const backHref = isBuyer ? "/portal" : "/dashboard";
  const backLabel = isBuyer ? t.backToPortal : t.backToDashboard;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.12),_transparent_35%),linear-gradient(180deg,_#fffaf1_0%,_#f7f2e8_48%,_#efe5d4_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md place-items-center">
        <Card className="w-full border-white/70 bg-white/90 backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{t.changeTitle}</CardTitle>
              <LanguageSwitcher currentLocale={locale} />
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
              className="block text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-slate-950 hover:underline"
            >
              {backLabel}
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
