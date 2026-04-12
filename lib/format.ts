import type { AppLocale } from "@/lib/i18n";

function toIntlLocale(locale: AppLocale) {
  switch (locale) {
    case "nl":
      return "nl-BE";
    case "fr":
      return "fr-BE";
    case "en":
    default:
      return "en-US";
  }
}

export function formatCurrency(value: number, locale: AppLocale = "en") {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatDate(value: Date | string, locale: AppLocale = "en") {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);
}
