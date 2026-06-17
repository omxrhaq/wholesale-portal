"use server";

import { redirect } from "next/navigation";

import { clearActiveCompanyId } from "@/lib/companies/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPasswordCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { buildAnonymousRateLimitKey } from "@/lib/security/request-rate-limit-key";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { safeUserFacingErrorMessage } from "@/lib/security/safe-errors";
import { passwordUpdateSchema } from "@/lib/validation/auth";

type PasswordUpdateState = {
  error?: string;
  success?: string;
};

export async function resetPasswordAction(
  _state: PasswordUpdateState,
  formData: FormData,
): Promise<PasswordUpdateState> {
  const locale = await getUserLocale();
  const copy = getPasswordCopy(locale);
  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    loginType: formData.get("loginType") || "wholesaler",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? copy.failed,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await assertRateLimit({
    bucket: "auth.password-reset-confirm",
    key: user
      ? user.id
      : await buildAnonymousRateLimitKey("auth.password-reset-confirm"),
    limit: 5,
    windowMs: 60_000,
  });

  if (!user) {
    return {
      error: copy.resetSessionExpired,
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: safeUserFacingErrorMessage(error, copy.failed),
    };
  }

  await supabase.auth.signOut();
  await clearActiveCompanyId();

  redirect(
    parsed.data.loginType === "buyer"
      ? "/portal/login?status=password-updated"
      : "/login?status=password-updated",
  );
}
