import { describe, expect, it } from "vitest";

import { readRepoFile } from "./security-test-utils";

describe("branch protection documentation", () => {
  it("documents required GitHub branch protection checks", () => {
    const docs = readRepoFile("docs/branch-protection.md");

    for (const requiredCheck of [
      "CI / Lint, unit, and docs",
      "CI / Production build",
      "CI / Full regression guardrails",
      "CI / Database migrations",
      "Security / Dependency audit",
      "Security / Secret scan",
      "Security / CodeQL",
      "Security / Security tests and coverage",
    ]) {
      expect(docs).toContain(requiredCheck);
    }
  });

  it("documents direct-push blocking and up-to-date branch requirements", () => {
    const docs = readRepoFile("docs/branch-protection.md");

    expect(docs).toContain("Require a pull request before merging");
    expect(docs).toContain("Block direct pushes to `main`");
    expect(docs).toContain("Require branches to be up to date before merging");
    expect(docs).toContain("Verification Checklist");
  });
});
