import { notFound } from "next/navigation";
import { Building2, Users } from "lucide-react";

import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { AdminCompanyHeader } from "@/components/admin/admin-company-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { getUserLocale } from "@/lib/i18n";
import { getAdminCopy } from "@/lib/i18n-copy";
import { getAdminCompanyWorkspace } from "@/lib/services/admin-service";

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const locale = await getUserLocale();
  const copy = getAdminCopy(locale);
  const workspace = await getAdminCompanyWorkspace(companyId);

  if (!workspace) notFound();

  return (
    <section className="space-y-6">
      <AdminCompanyHeader
        company={workspace.company}
        description={copy.companyMetadataOnlyDescription}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Building2} label={copy.companies} value={workspace.company.slug} />
        <MetricCard icon={Users} label={copy.totalStaff} value={String(workspace.company.staffCount)} />
        <MetricCard icon={Building2} label={copy.created} value={formatDate(workspace.company.createdAt, locale)} />
      </div>

      <div className="max-w-3xl">
        <AdminAuditHistory
          entries={workspace.recentAdminActivity}
          locale={locale}
          title={copy.recentSupportTitle}
          description={copy.privacySafeAuditDescription}
          emptyLabel={copy.noSupportActivity}
        />
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-5 text-primary" />
        </div>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
