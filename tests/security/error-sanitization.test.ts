import { describe, expect, it } from "vitest";

import { safeUserFacingErrorMessage } from "@/lib/security/safe-errors";
import { readRepoFile } from "./security-test-utils";

describe("error sanitization security gate", () => {
  it("never returns a raw backend error message to the user", () => {
    expect(
      safeUserFacingErrorMessage(new Error("database password leaked"), "Something failed."),
    ).toBe("Something failed.");
  });

  it("keeps product and password actions on the sanitization helper instead of raw Error.message", () => {
    for (const file of [
      "app/dashboard/products/actions.ts",
      "app/dashboard/products/categories/actions.ts",
      "app/account/password/actions.ts",
      "app/reset-password/actions.ts",
      "app/forgot-password/actions.ts",
    ]) {
      const source = readRepoFile(file);

      expect(source, file).not.toContain("return error.message;");
      expect(source, file).toContain("safeUserFacingErrorMessage");
    }
  });
});
