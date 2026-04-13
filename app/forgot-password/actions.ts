"use server";

import { headers } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPasswordCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { passwordResetRequestSchema } from "@/lib/validation/auth";

type ForgotPasswordState = {
  error?: string;
  success?: string;
};

export async function requestPasswordResetAction(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const locale = await getUserLocale();
  const copy = getPasswordCopy(locale);
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
    loginType: formData.get("loginType") || "wholesaler",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check your input.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getRequestOrigin();
  const redirectUrl = new URL("/auth/callback", origin);
  redirectUrl.searchParams.set(
    "next",
    `/reset-password?type=${parsed.data.loginType}`,
  );

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: redirectUrl.toString(),
    },
  );

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: copy.resetLinkSent,
  };
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const explicitOrigin = headerStore.get("origin");

  if (explicitOrigin) {
    return explicitOrigin;
  }

  const host = headerStore.get("host") ?? "localhost:3000";
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "http";

  return `${forwardedProto}://${host}`;
}
