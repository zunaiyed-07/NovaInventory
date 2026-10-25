import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/lib/store";
import type { CartItem } from "@/lib/types";

describe("checkout stock validation", () => {
  beforeEach(() => useStore.getState().resetData());

  it("rejects a sale that exceeds current stock without changing store data", () => {
    const store = useStore.getState();
    const product = store.products[0];
    const quantity = product.stock + 1;
    const item: CartItem = { ...product, quantity, discount: 0 };
    const salesBefore = store.sales.length;

    expect(() =>
      store.checkout({
        items: [item],
        subtotal: product.sellingPrice * quantity,
        discountAmount: 0,
        taxAmount: 0,
        total: product.sellingPrice * quantity,
        paymentMethod: "cash",
        paidAmount: product.sellingPrice * quantity,
      }),
    ).toThrow("insufficient_stock");
    expect(useStore.getState().products[0].stock).toBe(product.stock);
    expect(useStore.getState().sales).toHaveLength(salesBefore);
  });

  it("decrements stock for a valid sale and creates a unique invoice", () => {
    const product = useStore.getState().products[0];
    const item: CartItem = { ...product, quantity: 1, discount: 0 };
    const sale = useStore.getState().checkout({
      items: [item],
      subtotal: product.sellingPrice,
      discountAmount: 0,
      taxAmount: 0,
      total: product.sellingPrice,
      paymentMethod: "cash",
      paidAmount: product.sellingPrice,
    });

    expect(useStore.getState().products[0].stock).toBe(product.stock - 1);
    expect(sale.invoiceNo).toMatch(/^INV-\d+-[A-Z0-9]+$/);
  });
});
