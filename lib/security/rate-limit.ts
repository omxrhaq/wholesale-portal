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
  check(input: RateLimitInput): Promise<RateLimitResult> | RateLimitResult;
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

export class RateLimitConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitConfigurationError";
  }
}

type UpstashFetch = typeof fetch;

type UpstashRateLimiterOptions = {
  restUrl: string;
  token: string;
  fetcher?: UpstashFetch;
  keyPrefix?: string;
};

type UpstashPipelineResult = Array<{
  result?: unknown;
  error?: string;
}>;

export class UpstashRestRateLimiter implements RateLimiter {
  private readonly restUrl: string;
  private readonly token: string;
  private readonly fetcher: UpstashFetch;
  private readonly keyPrefix: string;

  constructor(options: UpstashRateLimiterOptions) {
    this.restUrl = options.restUrl.replace(/\/$/, "");
    this.token = options.token;
    this.fetcher = options.fetcher ?? fetch;
    this.keyPrefix = options.keyPrefix ?? "wholesale-portal:rate-limit";
  }

  async check(input: RateLimitInput): Promise<RateLimitResult> {
    const storageKey = `${this.keyPrefix}:${input.bucket}:${input.key}`;
    const response = await this.fetcher(`${this.restUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", storageKey],
        ["PEXPIRE", storageKey, input.windowMs, "NX"],
        ["PTTL", storageKey],
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Rate limit backend unavailable.");
    }

    const results = (await response.json()) as UpstashPipelineResult;
    const count = Number(results[0]?.result);
    const ttlMs = Number(results[2]?.result);

    if (!Number.isFinite(count) || results.some((result) => result.error)) {
      throw new Error("Rate limit backend returned an invalid response.");
    }

    const resetInMs = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : input.windowMs;

    return {
      allowed: count <= input.limit,
      remaining: Math.max(input.limit - count, 0),
      resetAt: new Date(Date.now() + resetInMs),
    };
  }
}

const memoryRateLimiter = new InMemoryRateLimiter();
let upstashRateLimiter: UpstashRestRateLimiter | null = null;

export function getRateLimiter() {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    return memoryRateLimiter;
  }

  if (process.env.RATE_LIMIT_BACKEND === "memory") {
    throw new RateLimitConfigurationError(
      "RATE_LIMIT_BACKEND=memory is not allowed in production.",
    );
  }

  if (
    process.env.RATE_LIMIT_BACKEND &&
    process.env.RATE_LIMIT_BACKEND !== "upstash"
  ) {
    throw new RateLimitConfigurationError(
      `Unsupported RATE_LIMIT_BACKEND: ${process.env.RATE_LIMIT_BACKEND}.`,
    );
  }

  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !token) {
    throw new RateLimitConfigurationError(
      "Production rate limiting requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }

  upstashRateLimiter ??= new UpstashRestRateLimiter({ restUrl, token });
  return upstashRateLimiter;
}

export async function assertRateLimit(input: RateLimitInput) {
  const result = await getRateLimiter().check(input);

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
  "auth.password-change",
  "auth.password-reset-confirm",
  "customer.portal-setup",
  "products.import",
  "portal.checkout",
  "portal.reorder",
  "admin.access",
] as const;
