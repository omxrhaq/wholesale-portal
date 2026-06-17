const LOCALHOST_PUBLIC_ORIGIN = "http://localhost:3000";

export class PublicOriginConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicOriginConfigurationError";
  }
}

export function getPublicOrigin() {
  const configured = getConfiguredPublicOrigin();

  if (configured) {
    return configured.origin;
  }

  if (isProduction()) {
    throw new PublicOriginConfigurationError(
      "Production requires APP_PUBLIC_URL or NEXT_PUBLIC_APP_URL.",
    );
  }

  return LOCALHOST_PUBLIC_ORIGIN;
}

export function buildPublicUrl(
  pathname: string,
  searchParams?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!pathname.startsWith("/")) {
    throw new PublicOriginConfigurationError(
      `Public URLs must use a relative pathname. Received: ${pathname}`,
    );
  }

  const url = new URL(pathname, getPublicOrigin());

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === null || value === undefined) {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function getConfiguredPublicOrigin() {
  const rawValue =
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";

  if (!rawValue) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(rawValue);
  } catch {
    throw new PublicOriginConfigurationError(
      `APP_PUBLIC_URL must be a valid absolute URL. Received: ${rawValue}`,
    );
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new PublicOriginConfigurationError(
      "APP_PUBLIC_URL must use http or https.",
    );
  }

  if (isProduction() && url.protocol !== "https:") {
    throw new PublicOriginConfigurationError(
      "Production requires APP_PUBLIC_URL to use https.",
    );
  }

  if (url.username || url.password) {
    throw new PublicOriginConfigurationError(
      "APP_PUBLIC_URL must not contain credentials.",
    );
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new PublicOriginConfigurationError(
      "APP_PUBLIC_URL must point to an origin without a path, query, or hash.",
    );
  }

  return url;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}
