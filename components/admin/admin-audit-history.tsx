import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { AppLocale } from "@/lib/i18n";
import type { AdminAuditEntry } from "@/lib/services/admin-audit-service";

type AdminAuditHistoryProps = {
  entries: AdminAuditEntry[];
  locale: AppLocale;
  title: string;
  description: string;
  emptyLabel: string;
};

export function AdminAuditHistory({ entries, locale, title, description, emptyLabel }: AdminAuditHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/70 bg-card/88 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">{describeAdminAudit(entry, locale)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.actor.name || entry.actor.email || "Platform operator"}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">{formatDate(entry.createdAt, locale)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function describeAdminAudit(entry: AdminAuditEntry, locale: AppLocale) {
  const label = entry.targetType === "customer"
    ? locale === "nl" ? "klantaccount" : locale === "fr" ? "compte client" : "customer account"
    : entry.targetType === "product"
      ? locale === "nl" ? "productrecord" : locale === "fr" ? "produit" : "product record"
      : entry.targetType === "order"
        ? locale === "nl" ? "orderrecord" : locale === "fr" ? "commande" : "order record"
        : locale === "nl" ? "tenantrecord" : locale === "fr" ? "enregistrement tenant" : "tenant record";

  return locale === "nl"
    ? `Historische platformactie op ${label}`
    : locale === "fr"
      ? `Action plateforme historique sur ${label}`
      : `Historical platform action on ${label}`;
}
