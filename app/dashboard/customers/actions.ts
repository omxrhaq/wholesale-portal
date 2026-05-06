"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { requireCompanyContext } from "@/lib/companies/context";
import { db } from "@/lib/db";
import { companyUsers, customers, profiles } from "@/lib/db/schema";
import { hasSupabaseServiceRoleKey } from "@/lib/env";
import {
  createCustomer,
  getCustomerById,
  setCustomerActive,
  updateCustomer,
} from "@/lib/services/customer-service";
import { logActivity } from "@/lib/services/activity-log-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  customerPortalLoginSchema,
  customerSchema,
  type CustomerInput,
  type CustomerPortalLoginInput,
} from "@/lib/validation/customer";

type CustomerActionResult = {
  success: boolean;
  error?: string;
  portalSetupLink?: string;
};

export async function createCustomerAction(
  values: CustomerInput,
): Promise<CustomerActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);
    const parsed = customerSchema.parse(values);

    if (parsed.isActive && parsed.email && !hasSupabaseServiceRoleKey()) {
      return {
        success: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local to automatically send portal setup emails for new customers.",
      };
    }

    const customer = await createCustomer(context, parsed);

    if (customer.isActive && customer.email) {
      try {
        await sendCustomerPortalSetupEmail(context, customer.id);
      } catch (error) {
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/customers");

        return {
          success: false,
          error: `Customer saved, but the portal setup email could not be sent: ${getActionErrorMessage(error)}`,
        };
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/customers");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getActionErrorMessage(error),
    };
  }
}

export async function updateCustomerAction(
  customerId: string,
  values: CustomerInput,
): Promise<CustomerActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);
    const parsed = customerSchema.parse(values);

    await updateCustomer(context, customerId, parsed);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${customerId}/edit`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getActionErrorMessage(error),
    };
  }
}

export async function setCustomerActiveAction(
  customerId: string,
  isActive: boolean,
) {
  const context = await requireCompanyContext([
    "wholesaler_owner",
    "wholesaler_staff",
  ]);

  await setCustomerActive(context, customerId, isActive);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
}

export async function setupCustomerPortalLoginAction(
  customerId: string,
  values: CustomerPortalLoginInput,
): Promise<CustomerActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);
    const parsed = customerPortalLoginSchema.parse(values);
    const customer = await getCustomerById(context.company.id, customerId);

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    if (!customer.isActive) {
      return {
        success: false,
        error: "Activate this customer before enabling portal login.",
      };
    }

    if (!customer.email) {
      return {
        success: false,
        error: "Add an email address to this customer first.",
      };
    }

    if (!hasSupabaseServiceRoleKey()) {
      return {
        success: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local to create buyer logins from the dashboard.",
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const existingUser = await findAuthUserByEmail(supabaseAdmin, customer.email);
    const authUser = existingUser
      ? await updateAuthUserPassword(existingUser.id, parsed.password)
      : await createAuthUser(customer.email, parsed.password, customer.name);

    await ensureBuyerAccess(context.company.id, customer.id, authUser.id, customer.email, customer.name);

    await logActivity({
      companyId: context.company.id,
      userId: context.userId,
      eventType: existingUser ? "customer.portal_password_updated" : "customer.portal_login_created",
      entityType: "customer",
      entityId: customer.id,
      metadata: {
        email: customer.email,
        authUserId: authUser.id,
      },
    });

    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${customerId}/edit`);

    return { success: true };

    async function createAuthUser(email: string, password: string, fullName: string) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (error || !data.user) {
        throw new Error(error?.message ?? "Could not create buyer login.");
      }

      return data.user;
    }

    async function updateAuthUserPassword(userId: string, password: string) {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          password,
          email_confirm: true,
        },
      );

      if (error || !data.user) {
        throw new Error(error?.message ?? "Could not update buyer password.");
      }

      return data.user;
    }
  } catch (error) {
    return {
      success: false,
      error: getActionErrorMessage(error),
    };
  }
}

export async function sendCustomerPortalSetupEmailAction(
  customerId: string,
): Promise<CustomerActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);

    if (!hasSupabaseServiceRoleKey()) {
      return {
        success: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local to send portal setup emails from the dashboard.",
      };
    }

    await sendCustomerPortalSetupEmail(context, customerId);
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${customerId}/edit`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getActionErrorMessage(error),
    };
  }
}

export async function generateCustomerPortalSetupLinkAction(
  customerId: string,
): Promise<CustomerActionResult> {
  try {
    const context = await requireCompanyContext([
      "wholesaler_owner",
      "wholesaler_staff",
    ]);

    if (!hasSupabaseServiceRoleKey()) {
      return {
        success: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local to generate portal setup links from the dashboard.",
      };
    }

    const customer = await getCustomerById(context.company.id, customerId);

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    if (!customer.isActive) {
      return {
        success: false,
        error: "Activate this customer before enabling portal login.",
      };
    }

    if (!customer.email) {
      return {
        success: false,
        error: "Add an email address to this customer first.",
      };
    }

    const redirectTo = await buildBuyerPasswordSetupUrl();
    const supabaseAdmin = createSupabaseAdminClient();
    const existingUser = await findAuthUserByEmail(supabaseAdmin, customer.email);

    if (existingUser) {
      await ensureBuyerAccess(
        context.company.id,
        customer.id,
        existingUser.id,
        customer.email,
        customer.name,
      );

      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: customer.email,
        options: {
          redirectTo,
        },
      });

      if (
        error ||
        !data.properties?.hashed_token ||
        !data.properties?.verification_type ||
        !data.properties?.redirect_to
      ) {
        throw new Error(error?.message ?? "Could not generate the portal setup link.");
      }

      await logActivity({
        companyId: context.company.id,
        userId: context.userId,
        eventType: "customer.portal_setup_link_generated",
        entityType: "customer",
        entityId: customer.id,
        metadata: {
          email: customer.email,
        },
      });

      return {
        success: true,
        portalSetupLink: buildPortalAuthCallbackLink({
          origin: await getRequestOrigin(),
          tokenHash: data.properties.hashed_token,
          type: data.properties.verification_type,
          redirectTo: data.properties.redirect_to,
        }),
      };
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: customer.email,
      options: {
        redirectTo,
        data: {
          full_name: customer.name,
        },
      },
    });

    if (
      error ||
      !data.user ||
      !data.properties?.hashed_token ||
      !data.properties?.verification_type ||
      !data.properties?.redirect_to
    ) {
      throw new Error(error?.message ?? "Could not generate the portal setup link.");
    }

    await ensureBuyerAccess(
      context.company.id,
      customer.id,
      data.user.id,
      customer.email,
      customer.name,
    );

    await logActivity({
      companyId: context.company.id,
      userId: context.userId,
      eventType: "customer.portal_setup_link_generated",
      entityType: "customer",
      entityId: customer.id,
      metadata: {
        email: customer.email,
      },
    });

    return {
      success: true,
      portalSetupLink: buildPortalAuthCallbackLink({
        origin: await getRequestOrigin(),
        tokenHash: data.properties.hashed_token,
        type: data.properties.verification_type,
        redirectTo: data.properties.redirect_to,
      }),
    };
  } catch (error) {
    return {
      success: false,
      error: getActionErrorMessage(error),
    };
  }
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

async function sendCustomerPortalSetupEmail(
  context: Awaited<ReturnType<typeof requireCompanyContext>>,
  customerId: string,
) {
  const customer = await getCustomerById(context.company.id, customerId);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  if (!customer.email) {
    throw new Error("Add an email address to this customer first.");
  }

  if (!customer.isActive) {
    throw new Error("Activate this customer before enabling portal login.");
  }

  const redirectTo = await buildBuyerPasswordSetupUrl();
  const supabaseAdmin = createSupabaseAdminClient();
  const existingUser = await findAuthUserByEmail(supabaseAdmin, customer.email);

  if (existingUser) {
    await ensureBuyerAccess(
      context.company.id,
      customer.id,
      existingUser.id,
      customer.email,
      customer.name,
    );

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(customer.email, {
      redirectTo,
    });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      customer.email,
      {
        redirectTo,
        data: {
          full_name: customer.name,
        },
      },
    );

    if (error || !data.user) {
      throw new Error(error?.message ?? "Could not send the portal setup email.");
    }

    await ensureBuyerAccess(
      context.company.id,
      customer.id,
      data.user.id,
      customer.email,
      customer.name,
    );
  }

  await logActivity({
    companyId: context.company.id,
    userId: context.userId,
    eventType: "customer.portal_setup_email_sent",
    entityType: "customer",
    entityId: customer.id,
    metadata: {
      email: customer.email,
    },
  });
}

async function findAuthUserByEmail(
  supabaseAdmin: SupabaseClient,
  email: string,
) {
  const normalizedEmail = email.toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find(
      (user: User) => user.email?.toLowerCase() === normalizedEmail,
    );

    if (match) {
      return match;
    }

    if (data.users.length < 100) {
      return null;
    }
  }

  return null;
}

async function ensureBuyerAccess(
  companyId: string,
  customerId: string,
  authUserId: string,
  email: string,
  fullName: string,
) {
  const existingMembership = await db
    .select({ role: companyUsers.role })
    .from(companyUsers)
    .where(
      and(
        eq(companyUsers.companyId, companyId),
        eq(companyUsers.userId, authUserId),
      ),
    )
    .limit(1);

  await db
    .insert(profiles)
    .values({
      id: authUserId,
      email,
      fullName,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email,
        fullName,
      },
    });

  if (!existingMembership[0]) {
    await db.insert(companyUsers).values({
      companyId,
      userId: authUserId,
      role: "buyer",
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(customers)
      .set({
        authUserId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.companyId, companyId),
          eq(customers.authUserId, authUserId),
        ),
      );

    const [customer] = await tx
      .update(customers)
      .set({
        authUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.companyId, companyId),
        ),
      )
      .returning();

    if (!customer) {
      throw new Error("Customer not found.");
    }
  });
}

async function buildBuyerPasswordSetupUrl() {
  const origin = await getRequestOrigin();
  const redirectUrl = new URL("/reset-password", origin);

  redirectUrl.searchParams.set("type", "buyer");

  return redirectUrl.toString();
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const explicitOrigin = headerStore.get("origin");

  if (explicitOrigin) {
    return explicitOrigin;
  }

  const host = headerStore.get("host") ?? "localhost:3000";
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "http";

  return `${forwardedProto}://${host}`;
}

function buildPortalAuthCallbackLink({
  origin,
  tokenHash,
  type,
  redirectTo,
}: {
  origin: string;
  tokenHash: string;
  type: string;
  redirectTo: string;
}) {
  const callbackUrl = new URL("/auth/callback", origin);

  callbackUrl.searchParams.set("token_hash", tokenHash);
  callbackUrl.searchParams.set("type", type);
  callbackUrl.searchParams.set("redirect_to", redirectTo);

  return callbackUrl.toString();
}
