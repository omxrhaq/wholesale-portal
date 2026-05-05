"use client";

import { ChevronDown } from "lucide-react";
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
    <label className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-card/92 px-4 py-2.5 text-sm text-foreground/85 shadow-sm shadow-slate-950/4 backdrop-blur-sm transition-all hover:border-primary/15 hover:bg-card">
      <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {t.language}
      </span>
      <div className="relative">
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
          className="h-10 min-w-20 appearance-none rounded-full border border-border/80 bg-background/90 pl-3.5 pr-10 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary/15"
        >
          <option value="en">EN</option>
          <option value="nl">NL</option>
          <option value="fr">FR</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </label>
  );
}
