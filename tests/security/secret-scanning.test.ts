import { describe, expect, it } from "vitest";

import { readRepoFile } from "./security-test-utils";

describe("project-specific secret scanning", () => {
  it("defines project-specific rules for high-risk secrets", () => {
    const config = readRepoFile(".gitleaks.toml");

    for (const ruleId of [
      "supabase-service-role-key",
      "jwt-secret-assignment",
      "database-url-with-credentials",
      "openai-or-api-style-key",
      "private-key-block",
      "public-env-secret-name",
    ]) {
      expect(config).toContain(`id = "${ruleId}"`);
    }
  });

  it("allowlists only the exact local CI Postgres URL in the security workflow", () => {
    const config = readRepoFile(".gitleaks.toml");

    expect(config).toContain(`[[rules.allowlists]]`);
    expect(config).toContain(`^\\.github/workflows/security\\.yml$`);
    expect(
      config.match(/postgresql:\/\/postgres:postgres@localhost:5432\/postgres/g),
    ).toHaveLength(1);
  });

  it("documents which env vars may be public", () => {
    const checklist = readRepoFile("docs/security-checklist.md");

    expect(checklist).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(checklist).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(checklist).toContain("Never expose");
    expect(checklist).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
