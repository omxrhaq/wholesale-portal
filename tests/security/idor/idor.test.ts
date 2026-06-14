import { describe, expect, it } from "vitest";

import { readRepoFile } from "../security-test-utils";

describe("IDOR security gate", () => {
  it("scopes order mutations through company context before accepting object ids", () => {
    const source = readRepoFile("app/dashboard/orders/actions.ts");

    expect(source).toContain("requireCompanyContext");
    expect(source).toContain("updateOrderStatus(context, orderId");
    expect(source).toContain("updateOrderDraft(context, orderId");
  });

  it("scopes portal reorder access by authenticated user and active company", () => {
    const source = readRepoFile("app/portal/actions.ts");

    expect(source).toContain("requireCompanyContext");
    expect(source).toContain("requireAuthUser");
    expect(source).toContain("buildPortalReorderDraft(context, authUser.id, orderId)");
  });
});
