import { describe, expect, it } from "vitest";

import {
  canTransitionOrderStatus,
  getAllowedNextOrderStatuses,
  isOpenOrderStatus,
} from "./orders";

describe("order workflow", () => {
  it("allows the intended forward status transitions", () => {
    expect(getAllowedNextOrderStatuses("new")).toEqual(["confirmed", "cancelled"]);
    expect(getAllowedNextOrderStatuses("confirmed")).toEqual([
      "processing",
      "cancelled",
    ]);
    expect(getAllowedNextOrderStatuses("processing")).toEqual([
      "completed",
      "cancelled",
    ]);
  });

  it("does not allow terminal orders to transition further", () => {
    expect(getAllowedNextOrderStatuses("completed")).toEqual([]);
    expect(getAllowedNextOrderStatuses("cancelled")).toEqual([]);
    expect(canTransitionOrderStatus("completed", "cancelled")).toBe(false);
    expect(canTransitionOrderStatus("cancelled", "new")).toBe(false);
  });

  it("allows idempotent status updates", () => {
    expect(canTransitionOrderStatus("new", "new")).toBe(true);
    expect(canTransitionOrderStatus("completed", "completed")).toBe(true);
    expect(canTransitionOrderStatus("cancelled", "cancelled")).toBe(true);
  });

  it("identifies open orders for operational views", () => {
    expect(isOpenOrderStatus("new")).toBe(true);
    expect(isOpenOrderStatus("confirmed")).toBe(true);
    expect(isOpenOrderStatus("processing")).toBe(true);
    expect(isOpenOrderStatus("completed")).toBe(false);
    expect(isOpenOrderStatus("cancelled")).toBe(false);
  });
});
