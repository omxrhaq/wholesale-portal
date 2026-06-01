"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/lib/admin/auth";
import {
  sendCustomerPortalSetupEmailAsSuperAdmin,
  setCustomerActiveAsSuperAdmin,
  setProductActiveAsSuperAdmin,
  updateCustomerAsSuperAdmin,
  updateOrderStatusAsSuperAdmin,
  updateProductAsSuperAdmin,
} from "@/lib/services/admin-service";
import { orderStatusOptions } from "@/lib/orders";
import type { OrderStatus } from "@/lib/db/schema";

function getSafeCompanyPath(companyId: FormDataEntryValue | null) {
  if (typeof companyId !== "string" || companyId.length === 0) {
    throw new Error("Missing company id.");
  }

  return `/admin/companies/${companyId}`;
}

function getRequiredString(formData: FormData, name: string) {
  const value = formData.get(name);

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
}

export async function setAdminCustomerActiveAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const companyPath = getSafeCompanyPath(formData.get("companyId"));
  const customerId = formData.get("customerId");
  const nextActiveRaw = formData.get("nextActive");

  if (typeof customerId !== "string" || customerId.length === 0) {
    redirect(`${companyPath}?error=support-action`);
  }

  try {
    await setCustomerActiveAsSuperAdmin(
      admin,
      getRequiredString(formData, "companyId"),
      customerId,
      nextActiveRaw === "true",
    );
  } catch {
    redirect(`${companyPath}?error=support-action`);
  }

  revalidatePath("/admin");
  revalidatePath(companyPath);
  redirect(
    `${companyPath}?status=${
      nextActiveRaw === "true" ? "customer-reactivated" : "customer-deactivated"
    }`,
  );
}

export async function sendAdminCustomerPortalSetupEmailAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const companyPath = getSafeCompanyPath(formData.get("companyId"));
  const customerId = formData.get("customerId");

  if (typeof customerId !== "string" || customerId.length === 0) {
    redirect(`${companyPath}?error=support-action`);
  }

  try {
    await sendCustomerPortalSetupEmailAsSuperAdmin(
      admin,
      getRequiredString(formData, "companyId"),
      customerId,
    );
  } catch {
    redirect(`${companyPath}?error=support-action`);
  }

  revalidatePath("/admin");
  revalidatePath(companyPath);
  redirect(`${companyPath}?status=portal-email-sent`);
}

export async function updateAdminCustomerAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const companyId = getRequiredString(formData, "companyId");
  const companyPath = getSafeCompanyPath(companyId);

  try {
    await updateCustomerAsSuperAdmin(admin, companyId, getRequiredString(formData, "customerId"), {
      name: getRequiredString(formData, "name"),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      isActive: formData.get("isActive") === "on",
    });
  } catch {
    redirect(`${companyPath}?error=support-action`);
  }

  revalidatePath("/admin");
  revalidatePath(companyPath);
  redirect(`${companyPath}?status=customer-updated`);
}

export async function setAdminProductActiveAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const companyId = getRequiredString(formData, "companyId");
  const companyPath = getSafeCompanyPath(companyId);
  const nextActive = formData.get("nextActive") === "true";

  try {
    await setProductActiveAsSuperAdmin(
      admin,
      companyId,
      getRequiredString(formData, "productId"),
      nextActive,
    );
  } catch {
    redirect(`${companyPath}?error=support-action`);
  }

  revalidatePath("/admin");
  revalidatePath(companyPath);
  revalidatePath("/portal");
  redirect(`${companyPath}?status=${nextActive ? "product-reactivated" : "product-deactivated"}`);
}

export async function updateAdminOrderStatusAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const companyId = getRequiredString(formData, "companyId");
  const companyPath = getSafeCompanyPath(companyId);
  const nextStatus = formData.get("nextStatus");

  try {
    if (typeof nextStatus !== "string" || !orderStatusOptions.includes(nextStatus as OrderStatus)) {
      throw new Error("Invalid order status.");
    }

    await updateOrderStatusAsSuperAdmin(
      admin,
      companyId,
      getRequiredString(formData, "orderId"),
      nextStatus as OrderStatus,
    );
  } catch {
    redirect(`${companyPath}?error=support-action`);
  }

  revalidatePath("/admin");
  revalidatePath(companyPath);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/portal");
  redirect(`${companyPath}?status=order-status-updated`);
}

export async function updateAdminProductAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const companyId = getRequiredString(formData, "companyId");
  const companyPath = getSafeCompanyPath(companyId);

  try {
    await updateProductAsSuperAdmin(admin, companyId, getRequiredString(formData, "productId"), {
      name: getRequiredString(formData, "name"),
      sku: getRequiredString(formData, "sku"),
      categoryName: String(formData.get("categoryName") ?? ""),
      description: String(formData.get("description") ?? ""),
      unit: getRequiredString(formData, "unit"),
      price: Number(formData.get("price")),
      isActive: formData.get("isActive") === "on",
    });
  } catch {
    redirect(`${companyPath}?error=support-action`);
  }

  revalidatePath("/admin");
  revalidatePath(companyPath);
  revalidatePath("/portal");
  redirect(`${companyPath}?status=product-updated`);
}
