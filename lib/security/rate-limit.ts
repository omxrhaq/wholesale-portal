export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

export type RateLimitInput = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimiter = {
  check(input: RateLimitInput): RateLimitResult;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export class InMemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();

  check(input: RateLimitInput): RateLimitResult {
    const now = Date.now();
    const storageKey = `${input.bucket}:${input.key}`;
    const current = this.entries.get(storageKey);

    if (!current || current.resetAt <= now) {
      const resetAt = now + input.windowMs;
      this.entries.set(storageKey, { count: 1, resetAt });

      return {
        allowed: true,
        remaining: Math.max(input.limit - 1, 0),
        resetAt: new Date(resetAt),
      };
    }

    if (current.count >= input.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(current.resetAt),
      };
    }

    current.count += 1;

    return {
      allowed: true,
      remaining: Math.max(input.limit - current.count, 0),
      resetAt: new Date(current.resetAt),
    };
  }
}

class NoopRateLimiter implements RateLimiter {
  check(input: RateLimitInput): RateLimitResult {
    return {
      allowed: true,
      remaining: input.limit,
      resetAt: new Date(Date.now() + input.windowMs),
    };
  }
}

const memoryRateLimiter = new InMemoryRateLimiter();
const noopRateLimiter = new NoopRateLimiter();

export function getRateLimiter() {
  if (
    process.env.RATE_LIMIT_BACKEND === "memory" ||
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    return memoryRateLimiter;
  }

  return noopRateLimiter;
}

export function assertRateLimit(input: RateLimitInput) {
  const result = getRateLimiter().check(input);

  if (!result.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    );

    throw new Error(`Too many requests. Try again in ${retryAfterSeconds} seconds.`);
  }

  return result;
}

export const sensitiveRateLimitBuckets = [
  "auth.login",
  "auth.portal-login",
  "auth.password-reset",
  "customer.portal-setup",
  "products.import",
  "portal.checkout",
  "portal.reorder",
  "admin.access",
] as const;
