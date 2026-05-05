"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type OrdersFilterBarProps = {
  query: string;
  label: string;
  placeholder: string;
};

export function OrdersFilterBar({
  query,
  label,
  placeholder,
}: OrdersFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [nextQuery, setNextQuery] = useState(query);

  useEffect(() => {
    setNextQuery(query);
  }, [query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      updateFilters({ q: nextQuery, page: null });
    }, 350);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextQuery]);

  function updateFilters(
    updates: Record<string, string | null>,
  ) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all" || (key === "sort" && value === "newest")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const queryString = params.toString();

    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="space-y-2">
        <label htmlFor="q" className="text-sm font-medium text-foreground">
          {label}
        </label>
        <input
          id="q"
          value={nextQuery}
          onChange={(event) => setNextQuery(event.target.value)}
          placeholder={placeholder}
          className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
