import { cookies } from "next/headers";

export const supportedLocales = ["en", "nl", "fr"] as const;
export type AppLocale = (typeof supportedLocales)[number];

const LOCALE_COOKIE_NAME = "app-locale";

export function isSupportedLocale(value: string): value is AppLocale {
  return supportedLocales.includes(value as AppLocale);
}

export async function getUserLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (rawLocale && isSupportedLocale(rawLocale)) {
    return rawLocale;
  }

  return "en";
}

export async function setUserLocale(locale: AppLocale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
