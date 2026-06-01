import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminSearch({
  action,
  query,
  placeholder,
}: {
  action: string;
  query: string;
  placeholder: string;
}) {
  return (
    <form action={action} className="flex max-w-xl gap-2">
      <Input name="q" defaultValue={query} placeholder={placeholder} />
      <Button type="submit" variant="outline">
        <Search className="size-4" />
        Search
      </Button>
    </form>
  );
}

export function AdminPagination({
  basePath,
  query,
  previousCursor,
  nextCursor,
}: {
  basePath: string;
  query: string;
  previousCursor: string | null;
  nextCursor: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">Showing a bounded result page</p>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" className={!previousCursor ? "pointer-events-none opacity-50" : ""}>
          <Link href={buildPageUrl(basePath, query, previousCursor, "prev")}>Previous</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className={!nextCursor ? "pointer-events-none opacity-50" : ""}>
          <Link href={buildPageUrl(basePath, query, nextCursor, "next")}>Next</Link>
        </Button>
      </div>
    </div>
  );
}

function buildPageUrl(basePath: string, query: string, cursor: string | null, direction: "next" | "prev") {
  const search = new URLSearchParams();

  if (query) search.set("q", query);
  if (cursor) {
    search.set("cursor", cursor);
    search.set("direction", direction);
  }

  const value = search.toString();
  return value ? `${basePath}?${value}` : basePath;
}
