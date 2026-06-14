import { describe, expect, it } from "vitest";

import { readRepoFile } from "../security-test-utils";

describe("upload/import security gate", () => {
  it("does not use the blocked SheetJS xlsx package for import parsing", () => {
    const packageJson = JSON.parse(readRepoFile("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.xlsx).toBeUndefined();
    expect(packageJson.devDependencies?.xlsx).toBeUndefined();
  });

  it("validates import payloads before writing products", () => {
    const source = readRepoFile("lib/services/import-service.ts");

    expect(source).toContain("productImportPayloadSchema.parse(payload)");
    expect(source).toContain("companyId: context.company.id");
  });
});
