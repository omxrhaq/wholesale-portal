import Link from "next/link";

import { AdminCompanyNav } from "@/components/admin/admin-company-nav";
import { Button } from "@/components/ui/button";

export function AdminCompanyHeader({
  company,
  description,
}: {
  company: { id: string; name: string; slug: string };
  description: string;
}) {
  return (
    <div className="space-y-4 rounded-[2rem] border border-border/70 bg-card/88 px-5 py-5 shadow-sm shadow-slate-950/4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">{company.slug}</p>
          <h2 className="text-3xl font-semibold text-foreground">{company.name}</h2>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">All companies</Link>
        </Button>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      <AdminCompanyNav companyId={company.id} />
    </div>
  );
}
