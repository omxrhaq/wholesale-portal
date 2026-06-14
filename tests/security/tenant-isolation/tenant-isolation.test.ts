import { describe, expect, it } from "vitest";

import { readRepoFile } from "../security-test-utils";

describe("tenant isolation security gate", () => {
  it("keeps company context membership lookup tied to authenticated user id", () => {
    const source = readRepoFile("lib/companies/context.ts");

    expect(source).toContain("requireAuthUser");
    expect(source).toContain("listCompanyMembershipsForUser(user.id)");
    expect(source).toContain("filterMembershipsByRole");
  });

  it("keeps RLS enabled automatically for new public tables", () => {
    const migration = readRepoFile("drizzle/0006_auto_enable_rls_new_tables.sql");

    expect(migration).toContain("ensure_rls_on_public_tables");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
  });
});
