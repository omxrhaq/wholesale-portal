import { describe, expect, it } from "vitest";

import { readRepoFile } from "../security-test-utils";

describe("authentication security gate", () => {
  it("validates credential-bearing auth server actions before calling Supabase auth", () => {
    for (const actionFile of [
      "app/login/actions.ts",
      "app/portal/login/actions.ts",
      "app/forgot-password/actions.ts",
      "app/reset-password/actions.ts",
    ]) {
      const source = readRepoFile(actionFile);

      expect(source, actionFile).toContain('"use server"');
      expect(source, actionFile).toContain("safeParse");
      expect(source, actionFile).toContain("createSupabaseServerClient");
    }
  });

  it("does not accept absolute next redirects from login actions", () => {
    for (const actionFile of ["app/login/actions.ts", "app/portal/login/actions.ts"]) {
      const source = readRepoFile(actionFile);

      expect(source, actionFile).toContain("getSafeNextPath");
      expect(source, actionFile).toContain('next.startsWith("/")');
      expect(source, actionFile).toContain('!next.startsWith("//")');
    }
  });
});
