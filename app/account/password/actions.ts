"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/session";
import { getPasswordCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
import { passwordUpdateSchema } from "@/lib/validation/auth";

type PasswordUpdateState = {
  error?: string;
  success?: string;
};

export async function changePasswordAction(
  _state: PasswordUpdateState,
  formData: FormData,
): Promise<PasswordUpdateState> {
  await requireAuthUser();

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
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: copy.passwordUpdated,
  };
}
