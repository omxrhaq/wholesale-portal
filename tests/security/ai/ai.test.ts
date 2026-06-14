import { describe, expect, it } from "vitest";

import {
  pullRequestSecurityQuestions,
  securityCategories,
} from "../security-policy";
import { readRepoFile } from "../security-test-utils";

describe("AI access security gate", () => {
  it("requires every PR to document AI access risk even before AI features exist", () => {
    const template = readRepoFile(".github/pull_request_template.md");

    expect(securityCategories).toContain("ai");
    expect(pullRequestSecurityQuestions).toContain("AI access risk?");
    expect(template).toContain("AI access risk:");
  });
});
