export type OrderProductQuantity = {
  productId: string;
  quantity: number;
};

export type AvailableOrderProduct = {
  id: string;
  name: string;
  price: number;
};

export type OrderLineDraft = {
  productId: string;
  productNameSnapshot: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export function normalizeProductQuantities(items: OrderProductQuantity[]) {
  const quantitiesByProductId = new Map<string, number>();

  for (const item of items) {
    const quantity = (quantitiesByProductId.get(item.productId) ?? 0) + item.quantity;

    if (quantity > 999999) {
      throw new Error("Quantity is too large.");
    }

    quantitiesByProductId.set(item.productId, quantity);
  }

  return Array.from(quantitiesByProductId, ([productId, quantity]) => ({
    productId,
    quantity,
  })).filter((item) => item.quantity > 0);
}

export function buildOrderLineDrafts(
  requestedItems: OrderProductQuantity[],
  availableProducts: AvailableOrderProduct[],
  {
    requireEveryProduct,
  }: {
    requireEveryProduct: boolean;
  },
): OrderLineDraft[] {
  if (requireEveryProduct && availableProducts.length !== requestedItems.length) {
    throw new Error("One or more selected products are no longer available.");
  }

  const productById = new Map(availableProducts.map((product) => [product.id, product]));
  const orderLines: OrderLineDraft[] = [];

  for (const item of requestedItems) {
    const product = productById.get(item.productId);

    if (!product) {
      continue;
    }

    const lineTotal = Number((product.price * item.quantity).toFixed(2));

    orderLines.push({
      productId: product.id,
      productNameSnapshot: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      lineTotal,
    });
  }

  return orderLines;
}

export function calculateOrderTotal(lines: OrderLineDraft[]) {
  return Number(lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
}
