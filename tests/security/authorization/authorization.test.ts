import { describe, expect, it } from "vitest";

import { readRepoFile } from "../security-test-utils";

const protectedActionFiles = [
  "app/dashboard/customers/actions.ts",
  "app/dashboard/orders/actions.ts",
  "app/dashboard/products/actions.ts",
  "app/dashboard/products/categories/actions.ts",
  "app/dashboard/products/import/actions.ts",
  "app/portal/actions.ts",
];

describe("authorization security gate", () => {
  it("requires company context in every protected dashboard and portal mutation file", () => {
    for (const actionFile of protectedActionFiles) {
      const source = readRepoFile(actionFile);

      expect(source, actionFile).toContain('"use server"');
      expect(source, actionFile).toContain("requireCompanyContext");
    }
  });

  it("guards super-admin surfaces with explicit super-admin authorization", () => {
    expect(readRepoFile("app/admin/layout.tsx")).toContain("requireSuperAdmin");
    expect(readRepoFile("lib/admin/auth.ts")).toContain("requireSuperAdmin");
  });
});
