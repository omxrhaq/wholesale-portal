import { and, eq, ilike } from "drizzle-orm";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { BuyerPortalClient } from "@/components/portal/buyer-portal-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthUser } from "@/lib/auth/session";
import { getPasswordCopy, getPortalCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { requireCompanyContext } from "@/lib/companies/context";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
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
  const matchedCustomers = authUser.email
    ? await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
        })
        .from(customers)
        .where(
          and(
            eq(customers.companyId, context.company.id),
            eq(customers.isActive, true),
            ilike(customers.email, authUser.email),
          ),
        )
        .limit(1)
    : [];
  const matchedCustomer = matchedCustomers[0] ?? null;

  if (!matchedCustomer && context.companyUser.role === "buyer") {
    redirect("/portal/logout?reason=inactive-buyer");
  }

  const orderHistory = matchedCustomer
    ? await getPortalOrderHistory(context.company.id, matchedCustomer.id)
    : [];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
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
              <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t.noCustomer}
              </p>
            ) : activeProducts.length === 0 ? (
              <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t.noProductsAvailable}
              </p>
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
