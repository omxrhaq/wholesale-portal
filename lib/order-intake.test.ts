import { describe, expect, it } from "vitest";

import {
  buildOrderLineDrafts,
  calculateOrderTotal,
  normalizeProductQuantities,
} from "./order-intake";

const products = [
  {
    id: "product-a",
    name: "Coffee Beans",
    price: 12.5,
  },
  {
    id: "product-b",
    name: "Tea Box",
    price: 4.25,
  },
];

describe("order intake", () => {
  it("merges duplicate product quantities before building an order", () => {
    expect(
      normalizeProductQuantities([
        { productId: "product-a", quantity: 2 },
        { productId: "product-b", quantity: 1 },
        { productId: "product-a", quantity: 3 },
      ]),
    ).toEqual([
      { productId: "product-a", quantity: 5 },
      { productId: "product-b", quantity: 1 },
    ]);
  });

  it("rejects quantities that exceed the order intake limit after merging", () => {
    expect(() =>
      normalizeProductQuantities([
        { productId: "product-a", quantity: 999999 },
        { productId: "product-a", quantity: 1 },
      ]),
    ).toThrow("Quantity is too large.");
  });

  it("rejects checkout when a requested product is unavailable", () => {
    expect(() =>
      buildOrderLineDrafts(
        [{ productId: "product-a", quantity: 2 }],
        [],
        { requireEveryProduct: true },
      ),
    ).toThrow("One or more selected products are no longer available.");
  });

  it("skips unavailable products for reorder drafts", () => {
    expect(
      buildOrderLineDrafts(
        [
          { productId: "product-a", quantity: 2 },
          { productId: "product-b", quantity: 4 },
        ],
        [products[0]],
        { requireEveryProduct: false },
      ),
    ).toEqual([
      {
        productId: "product-a",
        productNameSnapshot: "Coffee Beans",
        unitPrice: 12.5,
        quantity: 2,
        lineTotal: 25,
      },
    ]);
  });

  it("calculates totals from rounded line totals", () => {
    const lines = buildOrderLineDrafts(
      [
        { productId: "product-a", quantity: 2 },
        { productId: "product-b", quantity: 3 },
      ],
      products,
      { requireEveryProduct: true },
    );

    expect(lines).toEqual([
      {
        productId: "product-a",
        productNameSnapshot: "Coffee Beans",
        unitPrice: 12.5,
        quantity: 2,
        lineTotal: 25,
      },
      {
        productId: "product-b",
        productNameSnapshot: "Tea Box",
        unitPrice: 4.25,
        quantity: 3,
        lineTotal: 12.75,
      },
    ]);
    expect(calculateOrderTotal(lines)).toBe(37.75);
  });
});
