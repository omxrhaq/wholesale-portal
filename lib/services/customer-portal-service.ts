import { and, eq } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";

import { db } from "@/lib/db";
import { companyUsers, customers, profiles } from "@/lib/db/schema";
import { buildPublicUrl } from "@/lib/security/public-origin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/services/activity-log-service";

type SendCustomerPortalSetupEmailInput = {
  actorUserId: string;
  companyId: string;
  customerId: string;
};

type CustomerPortalTarget = {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  portalUserId: string | null;
  isActive: boolean;
};

export async function sendCustomerPortalSetupEmail({
  actorUserId,
  companyId,
  customerId,
}: SendCustomerPortalSetupEmailInput) {
  const customer = await getCustomerPortalTarget(companyId, customerId);

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
  const existingUser = await resolveCustomerPortalAuthUser(supabaseAdmin, customer);

  if (existingUser) {
    await ensureBuyerAccess({
      companyId,
      customerId,
      portalUserId: existingUser.id,
      email: customer.email,
      fullName: customer.name,
    });

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

    await ensureBuyerAccess({
      companyId,
      customerId,
      portalUserId: data.user.id,
      email: customer.email,
      fullName: customer.name,
    });
  }

  await logActivity({
    companyId,
    userId: actorUserId,
    eventType: "customer.portal_setup_email_sent",
    entityId: customer.id,
    metadata: {
      email: customer.email,
    },
  });

  return customer;
}

async function getCustomerPortalTarget(companyId: string, customerId: string) {
  const [customer] = await db
    .select({
      id: customers.id,
      companyId: customers.companyId,
      name: customers.name,
      email: customers.email,
      portalUserId: customers.portalUserId,
      isActive: customers.isActive,
    })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)))
    .limit(1);

  return customer ?? null;
}

async function getAuthUserById(supabaseAdmin: SupabaseClient, userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error) {
    throw new Error(error.message);
  }

  return data.user ?? null;
}

async function resolveCustomerPortalAuthUser(
  supabaseAdmin: SupabaseClient,
  customer: CustomerPortalTarget,
) {
  if (!customer.portalUserId) {
    return null;
  }

  const linkedUser = await getAuthUserById(supabaseAdmin, customer.portalUserId);

  if (!linkedUser) {
    throw new Error(
      "The linked portal user no longer exists. Generate a new portal login for this customer.",
    );
  }

  return linkedUser;
}

async function ensureBuyerAccess({
  companyId,
  customerId,
  portalUserId,
  email,
  fullName,
}: {
  companyId: string;
  customerId: string;
  portalUserId: string;
  email: string;
  fullName: string;
}) {
  const existingMembership = await db
    .select({ role: companyUsers.role })
    .from(companyUsers)
    .where(
      and(
        eq(companyUsers.companyId, companyId),
        eq(companyUsers.userId, portalUserId),
      ),
    )
    .limit(1);

  await db
    .insert(profiles)
    .values({
      id: portalUserId,
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
      userId: portalUserId,
      role: "buyer",
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(customers)
      .set({
        portalUserId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.companyId, companyId),
          eq(customers.portalUserId, portalUserId),
        ),
      );

    const [customer] = await tx
      .update(customers)
      .set({
        portalUserId,
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
  return buildPublicUrl("/reset-password", { type: "buyer" });
}
