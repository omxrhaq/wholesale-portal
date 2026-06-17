import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("next/headers");
  vi.resetModules();
});

describe("anonymous rate limit key security gate", () => {
  it("hashes request fingerprints instead of exposing raw headers", async () => {
    const headersMock = vi.fn(async () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "203.0.113.10");
      headers.set("user-agent", "Mozilla/5.0");
      return headers;
    });

    vi.doMock("next/headers", () => ({
      headers: headersMock,
    }));

    const { buildAnonymousRateLimitKey } = await import(
      "@/lib/security/request-rate-limit-key"
    );

    const key = await buildAnonymousRateLimitKey("auth.password-reset-confirm");

    expect(headersMock).toHaveBeenCalled();
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain("203.0.113.10");
    expect(key).not.toContain("Mozilla/5.0");
  });
});
