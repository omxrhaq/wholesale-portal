"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocaleAction } from "@/app/actions/locale";
import { getCommonCopy, type CopyLocale } from "@/lib/i18n-copy";

export function LanguageSwitcher({ currentLocale }: { currentLocale: CopyLocale }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const t = getCommonCopy(currentLocale);

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2 text-sm text-slate-700">
      <span className="font-medium">{t.language}</span>
      <select
        value={currentLocale}
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value;
          startTransition(async () => {
            await setLocaleAction(nextLocale);
            router.replace(pathname);
            router.refresh();
          });
        }}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm"
      >
        <option value="en">EN</option>
        <option value="nl">NL</option>
        <option value="fr">FR</option>
      </select>
    </label>
  );
}
