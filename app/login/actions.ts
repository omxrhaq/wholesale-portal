"use server";

import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { clearActiveCompanyId, setActiveCompanyId } from "@/lib/companies/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { companies, companyUsers } from "@/lib/db/schema";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

type LoginState = {
  error?: string;
};

function getSafeNextPath(next: string | null | undefined, fallback: string) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  return fallback;
}

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

  try {
    await assertRateLimit({
      bucket: "auth.login",
      key: parsed.data.email.toLowerCase(),
      limit: 5,
      windowMs: 60_000,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Too many sign-in attempts.",
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
    redirect("/login");
  }

  const membershipsRaw = await db
    .select({
      companyId: companyUsers.companyId,
      role: companyUsers.role,
    })
    .from(companyUsers)
    .innerJoin(companies, eq(companyUsers.companyId, companies.id))
    .where(eq(companyUsers.userId, user.id))
    .orderBy(asc(companies.name), asc(companyUsers.createdAt));

  const memberships = membershipsRaw.filter((membership) =>
    ["wholesaler_owner", "wholesaler_staff"].includes(membership.role),
  );

  if (memberships.length === 0) {
    await supabase.auth.signOut();
    await clearActiveCompanyId();
    return {
      error: "Your account is not linked to a wholesale company.",
    };
  }

  const nextPath = getSafeNextPath(parsed.data.next, "/dashboard");

  if (memberships.length === 1) {
    await setActiveCompanyId(memberships[0].companyId);
    redirect(nextPath);
  }

  await clearActiveCompanyId();
  redirect(`/select-company?mode=dashboard&next=${encodeURIComponent(nextPath)}`);
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearActiveCompanyId();
  redirect("/login");
}
