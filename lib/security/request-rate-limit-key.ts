import { createHash } from "node:crypto";

import { headers } from "next/headers";

export async function buildAnonymousRateLimitKey(namespace: string) {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip")?.trim() ??
    "unknown-ip";
  const userAgent = headerStore.get("user-agent")?.trim() ?? "unknown-agent";

  return createHash("sha256")
    .update(`${namespace}:${ip}:${userAgent}`)
    .digest("hex");
}
