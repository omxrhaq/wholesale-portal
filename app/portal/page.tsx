import { KeyRound, Package2, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { BuyerPortalClient } from "@/components/portal/buyer-portal-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAuthUser } from "@/lib/auth/session";
import { getPasswordCopy, getPortalCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { requireCompanyContext } from "@/lib/companies/context";
import { getActivePortalCustomer } from "@/lib/services/portal-access-service";
import { getPortalOrderHistory } from "@/lib/services/portal-service";
import { listProducts } from "@/lib/services/product-service";

export default async function PortalPage() {
  const context = await requireCompanyContext([
    "buyer",
    "wholesaler_owner",
    "wholesaler_staff",
  ]);
  const authUser = await requireAuthUser();
  const locale = await getUserLocale();
  const t = getPortalCopy(locale);
  const passwordCopy = getPasswordCopy(locale);
  const products = await listProducts(context.company.id);
  const activeProducts = products.filter((product) => product.isActive);
  const matchedCustomer = await getActivePortalCustomer(
    context.company.id,
    authUser.id,
  );

  if (!matchedCustomer && context.companyUser.role === "buyer") {
    redirect("/portal/logout?reason=inactive-buyer");
  }

  const orderHistory = matchedCustomer
    ? await getPortalOrderHistory(context.company.id, matchedCustomer.id)
    : [];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="w-full">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{t.buyerPortal}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatTemplate(t.orderingFor, {
                    name: context.company.name,
                    slug: context.company.slug,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher currentLocale={locale} />
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/account/password">
                    <KeyRound className="size-4" />
                    {passwordCopy.changePassword}
                  </Link>
                </Button>
                <LogoutButton />
              </div>
            </div>
            <CardDescription>
              {t.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!matchedCustomer ? (
              <EmptyState
                icon={ShoppingCart}
                title={t.buyerPortal}
                description={t.noCustomer}
                className="border-border/70 bg-white/90 py-14"
              />
            ) : activeProducts.length === 0 ? (
              <EmptyState
                icon={Package2}
                title={t.catalog}
                description={t.noProductsAvailable}
                className="border-border/70 bg-white/90 py-14"
              />
            ) : (
              <BuyerPortalClient
                locale={locale}
                customer={matchedCustomer}
                products={activeProducts}
                orderHistory={orderHistory}
                copy={t}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function formatTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, value),
    template,
  );
}
