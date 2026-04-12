"use server";

import { revalidatePath } from "next/cache";

import { isSupportedLocale, setUserLocale } from "@/lib/i18n";

export async function setLocaleAction(locale: string) {
  if (!isSupportedLocale(locale)) {
    return;
  }

  await setUserLocale(locale);
  revalidatePath("/", "layout");
}

