import Link from "next/link";
import { ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserLocale } from "@/lib/i18n";
import { getAdminCopy } from "@/lib/i18n-copy";

export default async function AdminAccessDeniedPage() {
  const locale = await getUserLocale();
  const copy = getAdminCopy(locale);

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <Card className="w-full">
          <CardHeader>
            <div className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl border border-destructive/15 bg-destructive/10 text-destructive">
              <ShieldOff className="size-5" />
            </div>
            <CardTitle>{copy.accessDeniedTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {copy.accessDeniedDescription}
            </p>
            <Button asChild>
              <Link href="/login">{copy.backToLogin}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
