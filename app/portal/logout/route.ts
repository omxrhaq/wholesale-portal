import { NextResponse } from "next/server";

import { clearActiveCompanyId } from "@/lib/companies/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearActiveCompanyId();

  const url = new URL(request.url);
  const redirectUrl = new URL("/portal/login", url.origin);
  const reason = url.searchParams.get("reason");

  if (reason) {
    redirectUrl.searchParams.set("error", reason);
  }

  return NextResponse.redirect(redirectUrl);
}
