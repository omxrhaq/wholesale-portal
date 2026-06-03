export type OrderProductQuantity = {
  productId: string;
  quantity: number;
};

export type AvailableOrderProduct = {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
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
  const productById = new Map(availableProducts.map((product) => [product.id, product]));
  const orderLines: OrderLineDraft[] = [];

  for (const item of requestedItems) {
    const product = productById.get(item.productId);

    if (!product) {
      if (requireEveryProduct) {
        throw new Error("One or more selected products are no longer available.");
      }
      continue;
    }

    if (requireEveryProduct && item.quantity > product.stockQuantity) {
      throw new Error(`Insufficient stock for ${product.name}.`);
    }

    const quantity = requireEveryProduct
      ? item.quantity
      : Math.min(item.quantity, product.stockQuantity);

    if (quantity <= 0) {
      continue;
    }

    const lineTotal = Number((product.price * quantity).toFixed(2));

    orderLines.push({
      productId: product.id,
      productNameSnapshot: product.name,
      unitPrice: product.price,
      quantity,
      lineTotal,
    });
  }

  return orderLines;
}

export function calculateOrderTotal(lines: OrderLineDraft[]) {
  return Number(lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
}
