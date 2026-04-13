"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { companyUsers } from "@/lib/db/schema";
import { getActivePortalCustomer } from "@/lib/services/portal-access-service";
import { loginSchema } from "@/lib/validation/auth";

type LoginState = {
  error?: string;
};

export async function portalLoginAction(
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Unable to load your account after sign-in.",
    };
  }

  const [membership] = await db
    .select({
      companyId: companyUsers.companyId,
      role: companyUsers.role,
    })
    .from(companyUsers)
    .where(eq(companyUsers.userId, user.id))
    .limit(1);

  if (
    !membership ||
    !["buyer", "wholesaler_owner", "wholesaler_staff"].includes(membership.role)
  ) {
    await supabase.auth.signOut();
    return {
      error: "Your account is not allowed to access the portal.",
    };
  }

  if (membership.role === "buyer") {
    const activeCustomer = await getActivePortalCustomer(
      membership.companyId,
      user.id,
    );

    if (!activeCustomer) {
      await supabase.auth.signOut();
      return {
        error: "This buyer account is inactive. Contact the wholesaler for access.",
      };
    }
  }

  redirect(parsed.data.next || "/portal");
}
