import { ChevronDown, Mail, PencilLine } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AppLocale } from "@/lib/i18n";
import { getOrderStatusLabel } from "@/lib/orders";
import type {
  ActivityFieldChange,
  ActivityLogEntry,
} from "@/lib/services/activity-log-service";
import { cn } from "@/lib/utils";

type ActivityHistoryProps = {
  entries: ActivityLogEntry[];
  locale: AppLocale;
  title?: string;
  description?: string;
  emptyLabel?: string;
  defaultOpen?: boolean;
  className?: string;
};

export function ActivityHistory({
  entries,
  locale,
  title,
  description,
  emptyLabel,
  defaultOpen = false,
  className,
}: ActivityHistoryProps) {
  const copy = getActivityCopy(locale);
  const latestEntry = entries[0] ? describeActivityEntry(entries[0], locale) : null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <details className="group" open={defaultOpen}>
        <summary className="list-none cursor-pointer select-none p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{title ?? copy.title}</p>
                <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {entries.length}
                </span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {latestEntry ? `${copy.latest}: ${latestEntry.title}` : emptyLabel ?? copy.empty}
              </p>
              {description ? (
                <p className="text-xs leading-5 text-muted-foreground/90">{description}</p>
              ) : null}
            </div>
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground transition-transform group-open:rotate-180">
              <ChevronDown className="size-3.5" />
            </span>
          </div>
        </summary>

        <CardContent className="border-t border-border/70 bg-muted/10 p-4">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
              {emptyLabel ?? copy.empty}
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {entries.map((entry) => {
                const detail = describeActivityEntry(entry, locale);
                const actorLabel = entry.actor.name || entry.actor.email || copy.unknownActor;

                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-border/70 bg-background/88 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{detail.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {copy.by} {actorLabel}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(entry.createdAt, locale)}
                      </p>
                    </div>

                    {detail.summary ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {detail.summary}
                      </p>
                    ) : null}

                    {detail.lines.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {detail.lines.map((line, index) => (
                          <div
                            key={`${entry.id}-${index}`}
                            className="flex items-start gap-2 text-sm leading-6 text-foreground/85"
                          >
                            <PencilLine className="mt-1 size-3.5 shrink-0 text-primary" />
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {detail.email ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="size-3.5" />
                        <span>{detail.email}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </details>
    </Card>
  );
}

function describeActivityEntry(entry: ActivityLogEntry, locale: AppLocale) {
  const copy = getActivityCopy(locale);
  const changes = getActivityFieldChanges(entry.metadata);
  const email = getMetadataString(entry.metadata, "email");
  const lines: string[] = [];

  for (const change of changes) {
    lines.push(formatFieldChange(change, locale));
  }

  const itemChanges = getMetadataArray(entry.metadata, "itemChanges");
  for (const itemChange of itemChanges) {
    const productName = getObjectString(itemChange, "productName");
    const beforeQuantity = getObjectNumber(itemChange, "beforeQuantity");
    const afterQuantity = getObjectNumber(itemChange, "afterQuantity");

    if (productName && beforeQuantity !== null && afterQuantity !== null) {
      lines.push(`${copy.quantityFor} ${productName}: ${beforeQuantity} -> ${afterQuantity}`);
    }
  }

  const removedItems = getMetadataArray(entry.metadata, "removedItems");
  for (const removedItem of removedItems) {
    const productName = getObjectString(removedItem, "productName");

    if (productName) {
      lines.push(`${copy.removedLine}: ${productName}`);
    }
  }

  switch (entry.eventType) {
    case "customer.created":
      return { title: copy.customerCreated, summary: null, lines, email };
    case "customer.updated":
      return { title: copy.customerUpdated, summary: null, lines, email };
    case "customer.reactivated":
      return { title: copy.customerReactivated, summary: null, lines, email };
    case "customer.deactivated":
      return { title: copy.customerDeactivated, summary: null, lines, email };
    case "customer.portal_login_created":
      return { title: copy.customerPortalLoginCreated, summary: null, lines, email };
    case "customer.portal_password_updated":
      return { title: copy.customerPortalPasswordUpdated, summary: null, lines, email };
    case "customer.portal_setup_email_sent":
      return { title: copy.customerPortalSetupEmailSent, summary: null, lines, email };
    case "customer.portal_setup_link_generated":
      return { title: copy.customerPortalSetupLinkGenerated, summary: null, lines, email };
    case "product.created":
      return { title: copy.productCreated, summary: null, lines, email: null };
    case "product.updated":
      return { title: copy.productUpdated, summary: null, lines, email: null };
    case "product.deactivated":
      return { title: copy.productDeactivated, summary: null, lines, email: null };
    case "product_category.created":
      return { title: copy.categoryCreated, summary: null, lines, email: null };
    case "product_category.updated":
      return { title: copy.categoryUpdated, summary: null, lines, email: null };
    case "order.created":
      return { title: copy.orderCreated, summary: null, lines, email: null };
    case "order.status_changed": {
      const previousStatus = getMetadataString(entry.metadata, "previousStatus");
      const nextStatus = getMetadataString(entry.metadata, "nextStatus");

      return {
        title: copy.orderStatusChanged,
        summary:
          previousStatus && nextStatus
            ? copy.statusChangedFromTo(
                formatStatusValue(previousStatus, locale),
                formatStatusValue(nextStatus, locale),
              )
            : nextStatus
              ? copy.statusChangedTo(formatStatusValue(nextStatus, locale))
              : null,
        lines,
        email: null,
      };
    }
    case "order.updated":
      return { title: copy.orderUpdated, summary: null, lines, email: null };
    default:
      return {
        title: copy.genericUpdate,
        summary: entry.eventType,
        lines,
        email,
      };
  }
}

function formatFieldChange(change: ActivityFieldChange, locale: AppLocale) {
  const copy = getActivityCopy(locale);
  const fields = copy.fields as Record<string, string>;
  const fieldLabel = fields[change.field] ?? change.field;

  return `${fieldLabel}: ${formatActivityValue(change.field, change.before, locale)} -> ${formatActivityValue(change.field, change.after, locale)}`;
}

function formatActivityValue(field: string, value: unknown, locale: AppLocale) {
  const copy = getActivityCopy(locale);

  if (value === null || value === undefined || value === "") {
    return copy.emptyValue;
  }

  if (field === "isActive") {
    return value ? copy.active : copy.inactive;
  }

  if (
    field === "price" ||
    field === "totalAmount" ||
    field === "unitPrice" ||
    field === "lineTotal"
  ) {
    return typeof value === "number" ? formatCurrency(value, locale) : String(value);
  }

  if (field === "status" && typeof value === "string") {
    return formatStatusValue(value, locale);
  }

  if (typeof value === "boolean") {
    return value ? copy.yes : copy.no;
  }

  return String(value);
}

function formatStatusValue(value: string, locale: AppLocale) {
  if (
    value === "new" ||
    value === "confirmed" ||
    value === "processing" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return getOrderStatusLabel(value, locale);
  }

  return value;
}

function getActivityFieldChanges(metadata: Record<string, unknown> | null) {
  const raw = metadata?.changes;

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const field = getObjectString(entry, "field");

      if (!field) {
        return null;
      }

      return {
        field,
        before: (entry as Record<string, unknown>).before,
        after: (entry as Record<string, unknown>).after,
      } satisfies ActivityFieldChange;
    })
    .filter((entry): entry is ActivityFieldChange => Boolean(entry));
}

function getMetadataString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function getMetadataArray(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return Array.isArray(value) ? value : [];
}

function getObjectString(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = (value as Record<string, unknown>)[key];
  return typeof entry === "string" ? entry : null;
}

function getObjectNumber(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = (value as Record<string, unknown>)[key];
  return typeof entry === "number" ? entry : null;
}

function getActivityCopy(locale: AppLocale) {
  const copy = {
    en: {
      title: "Activity history",
      empty: "No activity yet.",
      latest: "Latest",
      unknownActor: "Unknown user",
      by: "By",
      genericUpdate: "Update",
      customerCreated: "Customer created",
      customerUpdated: "Customer updated",
      customerReactivated: "Customer reactivated",
      customerDeactivated: "Customer deactivated",
      customerPortalLoginCreated: "Portal login created",
      customerPortalPasswordUpdated: "Portal password updated",
      customerPortalSetupEmailSent: "Password setup email sent",
      customerPortalSetupLinkGenerated: "Temporary setup link generated",
      productCreated: "Product created",
      productUpdated: "Product updated",
      productDeactivated: "Product deactivated",
      categoryCreated: "Category created",
      categoryUpdated: "Category updated",
      orderCreated: "Order created",
      orderStatusChanged: "Order status changed",
      orderUpdated: "Order edited",
      statusChangedFromTo: (from: string, to: string) => `Status changed from ${from} to ${to}`,
      statusChangedTo: (to: string) => `Status changed to ${to}`,
      quantityFor: "Quantity for",
      removedLine: "Removed line",
      emptyValue: "empty",
      active: "Active",
      inactive: "Inactive",
      yes: "Yes",
      no: "No",
      fields: {
        name: "Name",
        email: "Email",
        phone: "Phone",
        isActive: "Status",
        sku: "SKU",
        categoryName: "Category",
        description: "Description",
        unit: "Unit",
        price: "Price",
        notes: "Notes",
        totalAmount: "Total amount",
      },
    },
    nl: {
      title: "Geschiedenis",
      empty: "Nog geen geschiedenis.",
      latest: "Laatste",
      unknownActor: "Onbekende gebruiker",
      by: "Door",
      genericUpdate: "Wijziging",
      customerCreated: "Klant aangemaakt",
      customerUpdated: "Klant bijgewerkt",
      customerReactivated: "Klant geactiveerd",
      customerDeactivated: "Klant gedeactiveerd",
      customerPortalLoginCreated: "Portal login aangemaakt",
      customerPortalPasswordUpdated: "Portal wachtwoord bijgewerkt",
      customerPortalSetupEmailSent: "Wachtwoordmail verzonden",
      customerPortalSetupLinkGenerated: "Tijdelijke setup-link gegenereerd",
      productCreated: "Product aangemaakt",
      productUpdated: "Product bijgewerkt",
      productDeactivated: "Product gedeactiveerd",
      categoryCreated: "Categorie aangemaakt",
      categoryUpdated: "Categorie bijgewerkt",
      orderCreated: "Order aangemaakt",
      orderStatusChanged: "Orderstatus gewijzigd",
      orderUpdated: "Order bewerkt",
      statusChangedFromTo: (from: string, to: string) => `Status gewijzigd van ${from} naar ${to}`,
      statusChangedTo: (to: string) => `Status gewijzigd naar ${to}`,
      quantityFor: "Aantal voor",
      removedLine: "Verwijderde regel",
      emptyValue: "leeg",
      active: "Actief",
      inactive: "Inactief",
      yes: "Ja",
      no: "Nee",
      fields: {
        name: "Naam",
        email: "E-mail",
        phone: "Telefoon",
        isActive: "Status",
        sku: "SKU",
        categoryName: "Categorie",
        description: "Beschrijving",
        unit: "Eenheid",
        price: "Prijs",
        notes: "Notities",
        totalAmount: "Totaalbedrag",
      },
    },
    fr: {
      title: "Historique",
      empty: "Aucune activite pour le moment.",
      latest: "Derniere",
      unknownActor: "Utilisateur inconnu",
      by: "Par",
      genericUpdate: "Mise a jour",
      customerCreated: "Client cree",
      customerUpdated: "Client mis a jour",
      customerReactivated: "Client reactive",
      customerDeactivated: "Client desactive",
      customerPortalLoginCreated: "Connexion portail creee",
      customerPortalPasswordUpdated: "Mot de passe portail mis a jour",
      customerPortalSetupEmailSent: "E-mail de mot de passe envoye",
      customerPortalSetupLinkGenerated: "Lien temporaire genere",
      productCreated: "Produit cree",
      productUpdated: "Produit mis a jour",
      productDeactivated: "Produit desactive",
      categoryCreated: "Categorie creee",
      categoryUpdated: "Categorie mise a jour",
      orderCreated: "Commande creee",
      orderStatusChanged: "Statut de commande modifie",
      orderUpdated: "Commande modifiee",
      statusChangedFromTo: (from: string, to: string) => `Statut modifie de ${from} a ${to}`,
      statusChangedTo: (to: string) => `Statut modifie vers ${to}`,
      quantityFor: "Quantite pour",
      removedLine: "Ligne supprimee",
      emptyValue: "vide",
      active: "Actif",
      inactive: "Inactif",
      yes: "Oui",
      no: "Non",
      fields: {
        name: "Nom",
        email: "E-mail",
        phone: "Telephone",
        isActive: "Statut",
        sku: "SKU",
        categoryName: "Categorie",
        description: "Description",
        unit: "Unite",
        price: "Prix",
        notes: "Notes",
        totalAmount: "Montant total",
      },
    },
  } as const;

  return copy[locale];
}
