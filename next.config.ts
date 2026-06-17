import type { NextConfig } from "next";

export function getContentSecurityPolicy(nodeEnv = process.env.NODE_ENV) {
  const isProduction = nodeEnv === "production";

  return [
    "default-src 'self'",
    isProduction
      ? "script-src 'self'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function getBaseSecurityHeaders(nodeEnv = process.env.NODE_ENV) {
  return [
    {
      key: "Content-Security-Policy",
      value: getContentSecurityPolicy(nodeEnv),
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
  ];
}

export const baseSecurityHeaders = getBaseSecurityHeaders();

export const productionSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

export function getSecurityHeaders(nodeEnv = process.env.NODE_ENV) {
  const headers = getBaseSecurityHeaders(nodeEnv);

  if (nodeEnv === "production") {
    return [...headers, ...productionSecurityHeaders];
  }

  return headers;
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
