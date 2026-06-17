import { describe, expect, it } from "vitest";

import {
  isKnownSecurityCategory,
  normalizeSecurityAnswer,
  permanentRegressionRule,
  pullRequestSecurityQuestions,
  securityCategories,
} from "./security-policy";
import { repoFileExists, readRepoFile } from "./security-test-utils";

describe("security quality gate structure", () => {
  it("has a security test directory for every supported category", () => {
    for (const category of securityCategories) {
      expect(isKnownSecurityCategory(category)).toBe(true);
      expect(repoFileExists(`tests/security/${category}`), category).toBe(true);
    }
  });

  it("keeps PR security questions in the pull request template", () => {
    const template = normalizeSecurityAnswer(
      readRepoFile(".github/pull_request_template.md"),
    );

    for (const question of pullRequestSecurityQuestions) {
      expect(template).toContain(normalizeSecurityAnswer(question.replace("?", ":")));
      expect(normalizeSecurityAnswer(question)).toContain("?");
    }
  });

  it("documents permanent regression tests for discovered vulnerabilities", () => {
    expect(readRepoFile("docs/security-testing-strategy.md")).toContain(
      permanentRegressionRule,
    );
  });
});
