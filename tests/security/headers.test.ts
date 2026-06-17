import { describe, expect, it } from "vitest";

import {
  baseSecurityHeaders,
  getContentSecurityPolicy,
  getSecurityHeaders,
  productionSecurityHeaders,
} from "@/next.config";

describe("security headers", () => {
  it("defines baseline browser security headers", () => {
    const headers = new Map(baseSecurityHeaders.map((header) => [header.key, header.value]));

    expect(headers.get("Content-Security-Policy")).toBe(getContentSecurityPolicy());
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });

  it("drops unsafe-eval from the production CSP while keeping the app compatible", () => {
    const productionHeaders = new Map(
      getSecurityHeaders("production").map((header) => [header.key, header.value]),
    );
    const csp = productionHeaders.get("Content-Security-Policy");

    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("uses a CSP that blocks framing and object injection", () => {
    const contentSecurityPolicy = getContentSecurityPolicy();

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
