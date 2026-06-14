import { describe, expect, it } from "vitest";

import {
  baseSecurityHeaders,
  contentSecurityPolicy,
  getSecurityHeaders,
  productionSecurityHeaders,
} from "@/next.config";

describe("security headers", () => {
  it("defines baseline browser security headers", () => {
    const headers = new Map(baseSecurityHeaders.map((header) => [header.key, header.value]));

    expect(headers.get("Content-Security-Policy")).toBe(contentSecurityPolicy);
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });

  it("uses a CSP that blocks framing and object injection", () => {
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
    expect(contentSecurityPolicy).toContain("object-src 'none'");
    expect(contentSecurityPolicy).toContain("base-uri 'self'");
    expect(contentSecurityPolicy).toContain("form-action 'self'");
  });

  it("keeps HSTS separate so it only applies to production HTTPS", () => {
    expect(productionSecurityHeaders).toEqual([
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ]);
    expect(getSecurityHeaders()).not.toContainEqual({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  });
});
