import { describe, expect, it } from "vitest";

import { listRepoFiles, readRepoFile } from "../security-test-utils";

describe("XSS security gate", () => {
  it("does not introduce raw HTML rendering without a security review", () => {
    const sourceFiles = listRepoFiles(".", [".ts", ".tsx"]).filter(
      (file) => !file.startsWith("tests/security/"),
    );

    const offenders = sourceFiles.filter((file) =>
      readRepoFile(file).includes("dangerouslySetInnerHTML"),
    );

    expect(offenders).toEqual([]);
  });
});
