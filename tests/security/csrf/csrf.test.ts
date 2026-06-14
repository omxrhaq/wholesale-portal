import { describe, expect, it } from "vitest";

import { listRepoFiles, readRepoFile } from "../security-test-utils";

describe("CSRF security gate", () => {
  it("keeps mutating server action files behind auth or company context checks", () => {
    const actionFiles = listRepoFiles("app", ["actions.ts"]);
    const unguarded = actionFiles.filter((file) => {
      const source = readRepoFile(file);

      return (
        source.includes('"use server"') &&
        !source.includes("requireCompanyContext") &&
        !source.includes("createSupabaseServerClient")
      );
    });

    expect(unguarded).toEqual([]);
  });
});
