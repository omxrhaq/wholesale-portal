import { describe, expect, it } from "vitest";

import { readRepoFile } from "../security-test-utils";

describe("negative authorization invariants", () => {
  it("redirects guests away from admin before rendering admin content", () => {
    const adminLayout = readRepoFile("app/admin/layout.tsx");
    const adminAuth = readRepoFile("lib/admin/auth.ts");

    expect(adminLayout).toContain("requireSuperAdmin");
    expect(adminAuth).toContain('redirect("/login?next=/admin")');
    expect(adminAuth).toContain('redirect("/admin/access-denied")');
  });

  it("prevents user-controlled active company ids from granting access", () => {
    const source = readRepoFile("lib/companies/context.ts");

    expect(source).toContain("listCompanyMembershipsForUser(user.id)");
    expect(source).toContain("memberships.find");
    expect(source).toContain("throw new Error(\"You do not have access to that company.\")");
  });

  it("scopes customer and order object access by company context", () => {
    const customerService = readRepoFile("lib/services/customer-service.ts");
    const orderService = readRepoFile("lib/services/order-service.ts");

    expect(customerService).toContain("eq(customers.id, customerId)");
    expect(customerService).toContain("eq(customers.companyId, companyId)");
    expect(orderService).toContain("eq(orders.id, orderId)");
    expect(orderService).toContain("eq(orders.companyId, context.company.id)");
  });
});
