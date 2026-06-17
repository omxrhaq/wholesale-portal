import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertRateLimit,
  getRateLimiter,
  InMemoryRateLimiter,
  RateLimitConfigurationError,
  sensitiveRateLimitBuckets,
  UpstashRestRateLimiter,
} from "@/lib/security/rate-limit";
import { readRepoFile } from "../security-test-utils";

const originalNodeEnv = process.env.NODE_ENV;
const originalRateLimitBackend = process.env.RATE_LIMIT_BACKEND;
const originalUpstashRestUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalUpstashRestToken = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalRateLimitBackend === undefined) {
    delete process.env.RATE_LIMIT_BACKEND;
  } else {
    process.env.RATE_LIMIT_BACKEND = originalRateLimitBackend;
  }

  if (originalUpstashRestUrl === undefined) {
    delete process.env.UPSTASH_REDIS_REST_URL;
  } else {
    process.env.UPSTASH_REDIS_REST_URL = originalUpstashRestUrl;
  }

  if (originalUpstashRestToken === undefined) {
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  } else {
    process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashRestToken;
  }
});

describe("rate-limit behavior", () => {
  it("throttles requests after a bucket/key exceeds its limit", () => {
    const limiter = new InMemoryRateLimiter();
    const input = {
      bucket: "auth.login",
      key: "buyer@example.com",
      limit: 2,
      windowMs: 60_000,
    };

    expect(limiter.check(input).allowed).toBe(true);
    expect(limiter.check(input).allowed).toBe(true);
    expect(limiter.check(input).allowed).toBe(false);
  });

  it("tracks every sensitive flow as a named bucket", () => {
    expect(sensitiveRateLimitBuckets).toEqual([
      "auth.login",
      "auth.portal-login",
      "auth.password-reset",
      "auth.password-change",
      "auth.password-reset-confirm",
      "customer.portal-setup",
      "products.import",
      "portal.checkout",
      "portal.reorder",
      "admin.access",
    ]);
  });

  it("throws a stable error when assertRateLimit blocks a caller", async () => {
    const input = {
      bucket: "auth.password-reset",
      key: `reset-${randomUUID()}`,
      limit: 1,
      windowMs: 60_000,
    };

    await expect(assertRateLimit(input)).resolves.toMatchObject({ allowed: true });
    await expect(assertRateLimit(input)).rejects.toThrow("Too many requests.");
  });

  it("uses the test memory limiter in automated tests", () => {
    expect(getRateLimiter()).toBeInstanceOf(InMemoryRateLimiter);
  });

  it("fails closed in production when no distributed backend is configured", () => {
    process.env.NODE_ENV = "production";
    delete process.env.RATE_LIMIT_BACKEND;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    expect(() => getRateLimiter()).toThrow(RateLimitConfigurationError);
  });

  it("rejects explicit memory backend in production", () => {
    process.env.NODE_ENV = "production";
    process.env.RATE_LIMIT_BACKEND = "memory";

    expect(() => getRateLimiter()).toThrow("memory is not allowed in production");
  });

  it("uses an Upstash-compatible backend in production", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return new Response(
        JSON.stringify([
          { result: 3 },
          { result: 1 },
          { result: 45_000 },
        ]),
        { status: 200 },
      );
    };
    const limiter = new UpstashRestRateLimiter({
      restUrl: "https://example-upstash.upstash.io",
      token: "test-token",
      fetcher,
    });

    await expect(
      limiter.check({
        bucket: "auth.login",
        key: "buyer@example.com",
        limit: 5,
        windowMs: 60_000,
      }),
    ).resolves.toMatchObject({ allowed: true, remaining: 2 });

    expect(requests[0].url).toBe("https://example-upstash.upstash.io/pipeline");
    expect(requests[0].init?.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    });
  });

  it("fails closed when the Upstash-compatible backend returns an invalid response", async () => {
    const limiter = new UpstashRestRateLimiter({
      restUrl: "https://example-upstash.upstash.io",
      token: "test-token",
      fetcher: async () =>
        new Response(JSON.stringify([{ result: "not-a-number" }]), { status: 200 }),
    });

    await expect(
      limiter.check({
        bucket: "auth.login",
        key: "buyer@example.com",
        limit: 5,
        windowMs: 60_000,
      }),
    ).rejects.toThrow("invalid response");
  });

  it("rejects unsupported production backends", () => {
    process.env.NODE_ENV = "production";
    process.env.RATE_LIMIT_BACKEND = "local-cache";

    expect(() => getRateLimiter()).toThrow("Unsupported RATE_LIMIT_BACKEND");
  });

  it("builds an Upstash-compatible limiter when production env vars are configured", () => {
    process.env.NODE_ENV = "production";
    process.env.RATE_LIMIT_BACKEND = "upstash";
    process.env.UPSTASH_REDIS_REST_URL = "https://example-upstash.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    expect(getRateLimiter()).toBeInstanceOf(UpstashRestRateLimiter);
  });

  it("documents that production needs a distributed backend", () => {
    expect(readRepoFile("docs/security-testing-strategy.md")).toContain(
      "Production fails closed",
    );
    expect(readRepoFile("docs/security-checklist.md")).toContain(
      "Production requires an Upstash-compatible Redis backend",
    );
  });

  it("keeps sensitive routes and actions wired through assertRateLimit", () => {
    const protectedFiles = [
      "app/account/password/actions.ts",
      "app/reset-password/actions.ts",
      "app/login/actions.ts",
      "app/portal/login/actions.ts",
      "app/forgot-password/actions.ts",
      "app/dashboard/customers/actions.ts",
      "app/dashboard/products/import/actions.ts",
      "app/portal/actions.ts",
      "lib/admin/auth.ts",
    ];

    for (const file of protectedFiles) {
      expect(readRepoFile(file), file).toContain("await assertRateLimit");
    }
  });
});
