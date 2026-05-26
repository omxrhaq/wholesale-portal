"use client";

import { Building2, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  switchActiveCompanyAction,
  type CompanyAccessMode,
} from "@/app/actions/company";
import {
  getCompanyCopy,
  type CopyLocale,
} from "@/lib/i18n-copy";
import type { CompanyMembershipSummary } from "@/lib/companies/context";

export function CompanySwitcher({
  currentLocale,
  currentCompanyId,
  memberships,
  mode,
}: {
  currentLocale: CopyLocale;
  currentCompanyId: string;
  memberships: CompanyMembershipSummary[];
  mode: CompanyAccessMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const copy = getCompanyCopy(currentLocale);

  if (memberships.length < 2) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-card/92 px-4 py-2.5 text-sm text-foreground/85 shadow-sm shadow-slate-950/4 backdrop-blur-sm transition-all hover:border-primary/15 hover:bg-card">
        <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <Building2 className="size-3.5" />
          {copy.company}
        </span>
        <div className="relative">
          <select
            value={currentCompanyId}
            disabled={isPending}
            onChange={(event) => {
              const nextCompanyId = event.target.value;
              setError(null);

              startTransition(async () => {
                const result = await switchActiveCompanyAction(
                  nextCompanyId,
                  mode,
                );

                if (!result.success) {
                  setError(result.error ?? copy.switchFailed);
                  return;
                }

                router.replace(pathname);
                router.refresh();
              });
            }}
            className="h-10 min-w-44 appearance-none rounded-full border border-border/80 bg-background/90 pl-3.5 pr-10 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary/15"
          >
            {memberships.map((membership) => (
              <option key={membership.companyId} value={membership.companyId}>
                {membership.companyName}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </label>
      {error ? (
        <p className="px-2 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
