import Link from "next/link";
import { Building2, ShoppingCart } from "lucide-react";

import { getCurrentCompanyContext } from "@/lib/companies/context";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHomeCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";

export default async function HomePage() {
  const locale = await getUserLocale();
  const t = getHomeCopy(locale);
  const context = await getCurrentCompanyContext();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.12),_transparent_40%),linear-gradient(180deg,_#fffaf1_0%,_#f7f2e8_48%,_#efe5d4_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto grid max-w-4xl gap-6">
        <Card className="border-white/70 bg-white/90 backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">{t.title}</CardTitle>
            <CardDescription>
              {t.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Button asChild className="h-auto justify-start gap-3 py-4">
              <Link href="/login">
                <Building2 className="size-5" />
                {t.wholesalerLogin}
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-auto justify-start gap-3 py-4">
              <Link href="/portal/login">
                <ShoppingCart className="size-5" />
                {t.buyerLogin}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {context ? (
          <Card className="border-white/70 bg-white/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">
                {t.signedInAs(context.company.name)}
              </CardTitle>
              <CardDescription>
                {t.signedInDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard">{t.goToDashboard}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/portal">{t.goToPortal}</Link>
              </Button>
              <LogoutButton />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
