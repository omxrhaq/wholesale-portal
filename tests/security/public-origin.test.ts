import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPublicUrl,
  getPublicOrigin,
  PublicOriginConfigurationError,
} from "@/lib/security/public-origin";
import { readRepoFile } from "./security-test-utils";

const originalNodeEnv = process.env.NODE_ENV;
const originalAppPublicUrl = process.env.APP_PUBLIC_URL;
const originalNextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;

  if (originalAppPublicUrl === undefined) {
    delete process.env.APP_PUBLIC_URL;
  } else {
    process.env.APP_PUBLIC_URL = originalAppPublicUrl;
  }

  if (originalNextPublicAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalNextPublicAppUrl;
  }

  vi.restoreAllMocks();
  vi.doUnmock("next/headers");
  vi.doUnmock("@/lib/supabase/server");
  vi.doUnmock("@/lib/i18n");
  vi.doUnmock("@/lib/i18n-copy");
  vi.doUnmock("@/lib/security/rate-limit");
  vi.resetModules();
});

describe("public origin security gate", () => {
  it("falls back to localhost in development and test when no public URL is configured", () => {
    process.env.NODE_ENV = "test";
    delete process.env.APP_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getPublicOrigin()).toBe("http://localhost:3000");
  });

  it("rejects production without an explicit public URL", () => {
    process.env.NODE_ENV = "production";
    delete process.env.APP_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(() => getPublicOrigin()).toThrow(PublicOriginConfigurationError);
  });

  it("rejects production public URLs that are not https", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_PUBLIC_URL = "http://portal.example.com";

    expect(() => getPublicOrigin()).toThrow("Production requires APP_PUBLIC_URL to use https.");
  });

  it("normalizes a valid canonical public URL", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_PUBLIC_URL = "https://portal.example.com/";

    expect(buildPublicUrl("/reset-password", { type: "buyer" })).toBe(
      "https://portal.example.com/reset-password?type=buyer",
    );
  });

  it("ignores hostile host and origin headers because canonical links come from env only", async () => {
    process.env.NODE_ENV = "test";
    process.env.APP_PUBLIC_URL = "https://portal.example.com";

    let capturedRedirectTo: string | null = null;
    const headersMock = vi.fn(async () => {
      const headers = new Headers();
      headers.set("origin", "https://evil.example");
      headers.set("host", "evil.example");
      headers.set("x-forwarded-proto", "http");
      return headers;
    });

    vi.doMock("next/headers", () => ({
      headers: headersMock,
    }));

    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: async () => ({
        auth: {
          resetPasswordForEmail: async (_email: string, options: { redirectTo: string }) => ({
            error: null,
            options,
            capturedRedirectTo: (capturedRedirectTo = options.redirectTo),
          }),
        },
      }),
    }));

    vi.doMock("@/lib/i18n", () => ({
      getUserLocale: async () => "en",
    }));

    vi.doMock("@/lib/i18n-copy", () => ({
      getPasswordCopy: () => ({
        resetLinkSent: "reset link sent",
        failed: "failed",
      }),
    }));

    vi.doMock("@/lib/security/rate-limit", () => ({
      assertRateLimit: async () => ({ allowed: true, remaining: 1, resetAt: new Date() }),
    }));

    const { requestPasswordResetAction } = await import(
      "@/app/forgot-password/actions"
    );

    const formData = new FormData();
    formData.set("email", "buyer@example.com");
    formData.set("loginType", "buyer");

    const result = await requestPasswordResetAction({}, formData);

    expect(headersMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: "reset link sent" });
    expect(capturedRedirectTo).toBe("https://portal.example.com/reset-password?type=buyer");
  });

  it("documents that all security-sensitive email link callers use the canonical public-origin helper", () => {
    expect(readRepoFile("app/forgot-password/actions.ts")).toContain(
      "buildPublicUrl(\"/reset-password\"",
    );
    expect(readRepoFile("app/dashboard/customers/actions.ts")).toContain(
      "buildPublicUrl(\"/auth/callback\"",
    );
    expect(readRepoFile("lib/services/customer-portal-service.ts")).toContain(
      "buildPublicUrl(\"/reset-password\"",
    );
    expect(readRepoFile("app/forgot-password/actions.ts")).not.toContain("headers()");
    expect(readRepoFile("app/dashboard/customers/actions.ts")).not.toContain("headers()");
    expect(readRepoFile("lib/services/customer-portal-service.ts")).not.toContain(
      "headers()",
    );
  });
});
