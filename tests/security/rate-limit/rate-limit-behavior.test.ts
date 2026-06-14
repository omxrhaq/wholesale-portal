import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertRateLimit,
  getRateLimiter,
  InMemoryRateLimiter,
  sensitiveRateLimitBuckets,
} from "@/lib/security/rate-limit";
import { readRepoFile } from "../security-test-utils";

const originalNodeEnv = process.env.NODE_ENV;
const originalRateLimitBackend = process.env.RATE_LIMIT_BACKEND;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalRateLimitBackend === undefined) {
    delete process.env.RATE_LIMIT_BACKEND;
  } else {
    process.env.RATE_LIMIT_BACKEND = originalRateLimitBackend;
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
      "customer.portal-setup",
      "products.import",
      "portal.checkout",
      "portal.reorder",
      "admin.access",
    ]);
  });

  it("throws a stable error when assertRateLimit blocks a caller", () => {
    const input = {
      bucket: "auth.password-reset",
      key: `reset-${randomUUID()}`,
      limit: 1,
      windowMs: 60_000,
    };

    expect(assertRateLimit(input).allowed).toBe(true);
    expect(() => assertRateLimit(input)).toThrow("Too many requests.");
  });

  it("uses the test memory limiter in automated tests", () => {
    expect(getRateLimiter()).toBeInstanceOf(InMemoryRateLimiter);
  });

  it("falls back to no-op in production until a distributed backend is configured", () => {
    process.env.NODE_ENV = "production";
    delete process.env.RATE_LIMIT_BACKEND;

    const result = getRateLimiter().check({
      bucket: "portal.checkout",
      key: "production-user",
      limit: 1,
      windowMs: 60_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("documents that production needs a distributed backend", () => {
    expect(readRepoFile("docs/security-testing-strategy.md")).toContain(
      "Production defaults to no-op",
    );
    expect(readRepoFile("docs/security-checklist.md")).toContain(
      "distributed backend",
    );
  });
});
