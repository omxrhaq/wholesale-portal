import Link from "next/link";

import { resetPasswordAction } from "@/app/reset-password/actions";
import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth/session";
import { getPasswordCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const loginType = params.type === "buyer" ? "buyer" : "wholesaler";
  const locale = await getUserLocale();
  const t = getPasswordCopy(locale);
  const user = await getAuthUser();
  const retryHref = `/forgot-password?type=${loginType}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.14),_transparent_35%),linear-gradient(180deg,_#f5fbfa_0%,_#ecf7f5_45%,_#e6f0ed_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md place-items-center">
        <Card className="w-full border-white/70 bg-white/90 backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{t.resetTitle}</CardTitle>
              <LanguageSwitcher currentLocale={locale} />
            </div>
            <CardDescription>{t.resetDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!user ? (
              <div className="space-y-4">
                <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {t.resetSessionExpired}
                </p>
                <Link
                  href={retryHref}
                  className="block text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-slate-950 hover:underline"
                >
                  {t.requestNewResetLink}
                </Link>
              </div>
            ) : (
              <PasswordUpdateForm
                action={resetPasswordAction}
                loginType={loginType}
                copy={t}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
