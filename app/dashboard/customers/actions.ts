"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { requireCompanyContext } from "@/lib/companies/context";
import { db } from "@/lib/db";
import { companyUsers, profiles } from "@/lib/db/schema";
import { hasSupabaseServiceRoleKey } from "@/lib/env";
import {
  createCustomer,
  getCustomerById,
  linkCustomerToAuthUser,
  setCustomerActive,
  updateCustomer,
} from "@/lib/services/customer-service";
import { logActivity } from "@/lib/services/activity-log-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  customerPortalLoginSchema,
  customerSchema,
  type CustomerInput,
  type CustomerPortalLoginInput,
} from "@/lib/validation/customer";

type CustomerActionResult = {
  success: boolean;
  error?: string;
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

    await createCustomer(context, parsed);
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

    const existingMembership = await db
      .select({ role: companyUsers.role })
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, context.company.id),
          eq(companyUsers.userId, authUser.id),
        ),
      )
      .limit(1);

    const currentRole = existingMembership[0]?.role;

    await db
      .insert(profiles)
      .values({
        id: authUser.id,
        email: customer.email,
        fullName: customer.name,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          email: customer.email,
          fullName: customer.name,
        },
      });

    if (!currentRole) {
      await db.insert(companyUsers).values({
        companyId: context.company.id,
        userId: authUser.id,
        role: "buyer",
      });
    }

    await linkCustomerToAuthUser(context, customer.id, authUser.id);

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

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
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
