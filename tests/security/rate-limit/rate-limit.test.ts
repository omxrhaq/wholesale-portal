import { describe, expect, it } from "vitest";

import { permanentRegressionRule, securityCategories } from "../security-policy";
import { readRepoFile } from "../security-test-utils";

describe("rate-limit security gate", () => {
  it("tracks rate limiting as a first-class security category until runtime controls exist", () => {
    expect(securityCategories).toContain("rate-limit");
    expect(readRepoFile("docs/security-testing-strategy.md")).toContain(
      "rate-limit",
    );
    expect(permanentRegressionRule).toContain("permanent regression test");
  });
});
