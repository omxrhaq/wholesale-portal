"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPasswordCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { buildPublicUrl } from "@/lib/security/public-origin";
import { safeUserFacingErrorMessage } from "@/lib/security/safe-errors";
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

  try {
    await assertRateLimit({
      bucket: "auth.password-reset",
      key: parsed.data.email.toLowerCase(),
      limit: 3,
      windowMs: 60_000,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Too many password reset attempts.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const redirectUrl = await buildResetPasswordUrl(parsed.data.loginType);

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: redirectUrl,
    },
  );

  if (error) {
    return {
      error: safeUserFacingErrorMessage(error, copy.failed),
    };
  }

  return {
    success: copy.resetLinkSent,
  };
}

async function buildResetPasswordUrl(loginType: "wholesaler" | "buyer") {
  return buildPublicUrl("/reset-password", { type: loginType });
}
