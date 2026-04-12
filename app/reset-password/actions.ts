"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPasswordCopy } from "@/lib/i18n-copy";
import { getUserLocale } from "@/lib/i18n";
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
      error: error.message,
    };
  }

  await supabase.auth.signOut();

  redirect(
    parsed.data.loginType === "buyer"
      ? "/portal/login?status=password-updated"
      : "/login?status=password-updated",
  );
}
