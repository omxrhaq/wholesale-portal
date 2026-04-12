"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { companyUsers } from "@/lib/db/schema";
import { loginSchema } from "@/lib/validation/auth";

type LoginState = {
  error?: string;
};

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check your input.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: "Sign-in failed. Please verify your credentials and try again.",
    };
  }

  if (parsed.data.next) {
    redirect(parsed.data.next);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [membership] = await db
    .select({
      role: companyUsers.role,
    })
    .from(companyUsers)
    .where(eq(companyUsers.userId, user.id))
    .limit(1);

  if (membership?.role === "buyer") {
    redirect("/portal");
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
