"use server";

import { redirect } from "next/navigation";

import { requireAuthUser } from "@/lib/auth/session";
import {
  setActiveCompanyForCurrentUser,
  type CompanyContext,
} from "@/lib/companies/context";
import type { AppRole } from "@/lib/db/schema";
import { getActivePortalCustomer } from "@/lib/services/portal-access-service";

const dashboardRoles = ["wholesaler_owner", "wholesaler_staff"] satisfies AppRole[];
const portalRoles = [
  "buyer",
  "wholesaler_owner",
  "wholesaler_staff",
] satisfies AppRole[];

export type CompanyAccessMode = "dashboard" | "portal";

type SwitchCompanyResult = {
  success: boolean;
  error?: string;
};

function getAllowedRolesForMode(mode: CompanyAccessMode) {
  return mode === "portal" ? portalRoles : dashboardRoles;
}

function getSafeRedirectTarget(mode: CompanyAccessMode, nextPath?: string | null) {
  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    return nextPath;
  }

  return mode === "portal" ? "/portal" : "/dashboard";
}

async function ensureBuyerPortalAccess(context: CompanyContext) {
  if (context.companyUser.role !== "buyer") {
    return;
  }

  const user = await requireAuthUser();
  const customer = await getActivePortalCustomer(context.company.id, user.id);

  if (!customer) {
    throw new Error("This buyer account is inactive for that company.");
  }
}

async function activateCompany(companyId: string, mode: CompanyAccessMode) {
  const context = await setActiveCompanyForCurrentUser(
    companyId,
    getAllowedRolesForMode(mode),
  );

  if (mode === "portal") {
    await ensureBuyerPortalAccess(context);
  }

  return context;
}

export async function switchActiveCompanyAction(
  companyId: string,
  mode: CompanyAccessMode,
): Promise<SwitchCompanyResult> {
  try {
    await activateCompany(companyId, mode);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not switch company.",
    };
  }
}

export async function selectCompanyAction(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");
  const rawMode = String(formData.get("mode") ?? "dashboard");
  const nextPath = String(formData.get("next") ?? "");
  const mode: CompanyAccessMode = rawMode === "portal" ? "portal" : "dashboard";

  await activateCompany(companyId, mode);

  redirect(getSafeRedirectTarget(mode, nextPath));
}
