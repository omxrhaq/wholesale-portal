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

export function AdminAuditHistory({
  entries,
  locale,
  title,
  description,
  emptyLabel,
}: AdminAuditHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const actorLabel =
                entry.actor.name || entry.actor.email || "Unknown operator";

              return (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-border/70 bg-card/88 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-primary" />
                        <p className="text-sm font-medium text-foreground">
                          {describeAdminAudit(entry, locale)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{actorLabel}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(entry.createdAt, locale)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function describeAdminAudit(entry: AdminAuditEntry, locale: AppLocale) {
  const metadata = entry.metadata ?? {};
  const customerName =
    typeof metadata.customerName === "string"
      ? metadata.customerName
      : locale === "nl"
        ? "klant"
        : locale === "fr"
          ? "client"
          : "customer";
  const productName =
    typeof metadata.productName === "string"
      ? metadata.productName
      : locale === "nl"
        ? "product"
        : locale === "fr"
          ? "produit"
          : "product";
  const orderId = entry.targetId?.slice(0, 8).toUpperCase() ?? "order";

  switch (entry.actionType) {
    case "admin.customer.deactivated":
      return locale === "nl"
        ? `Klant gedeactiveerd: ${customerName}`
        : locale === "fr"
          ? `Client desactive: ${customerName}`
          : `Customer deactivated: ${customerName}`;
    case "admin.customer.reactivated":
      return locale === "nl"
        ? `Klant geactiveerd: ${customerName}`
        : locale === "fr"
          ? `Client reactive: ${customerName}`
          : `Customer reactivated: ${customerName}`;
    case "admin.customer.portal_setup_email_sent":
      return locale === "nl"
        ? `Wachtwoordmail verzonden: ${customerName}`
        : locale === "fr"
          ? `E-mail de mot de passe envoye: ${customerName}`
          : `Password setup email sent: ${customerName}`;
    case "admin.customer.updated":
      return locale === "nl"
        ? `Klant bijgewerkt: ${customerName}`
        : locale === "fr"
          ? `Client mis a jour: ${customerName}`
          : `Customer updated: ${customerName}`;
    case "admin.product.deactivated":
      return locale === "nl"
        ? `Product gedeactiveerd: ${productName}`
        : locale === "fr"
          ? `Produit desactive: ${productName}`
          : `Product deactivated: ${productName}`;
    case "admin.product.reactivated":
      return locale === "nl"
        ? `Product geactiveerd: ${productName}`
        : locale === "fr"
          ? `Produit reactive: ${productName}`
          : `Product reactivated: ${productName}`;
    case "admin.product.updated":
      return locale === "nl"
        ? `Product bijgewerkt: ${productName}`
        : locale === "fr"
          ? `Produit mis a jour: ${productName}`
          : `Product updated: ${productName}`;
    case "admin.order.status_changed":
      return locale === "nl"
        ? `Orderstatus bijgewerkt: ${orderId}`
        : locale === "fr"
          ? `Statut de commande mis a jour: ${orderId}`
          : `Order status updated: ${orderId}`;
    default:
      return entry.actionType;
  }
}
