import { describe, expect, it } from "vitest";
import { useStore, type Data } from "@/lib/store";
import { mergeSyncData } from "@/lib/sync";

const snapshot = (): Data => {
  const { products, customers, sales, shift, shiftHistory, vouchers, expenses, settings } =
    useStore.getState();
  return { products, customers, sales, shift, shiftHistory, vouchers, expenses, settings };
};

describe("local device synchronization", () => {
  it("merges simultaneous sales, stock changes, and drawer updates", () => {
    useStore.getState().resetData();
    const base = snapshot();
    const product = base.products[0];
    const localSale = { ...base.sales[0], id: "local-sale", invoiceNo: "INV-LOCAL" };
    const remoteSale = { ...base.sales[0], id: "remote-sale", invoiceNo: "INV-REMOTE" };
    const local: Data = {
      ...base,
      products: base.products.map((item) =>
        item.id === product.id ? { ...item, stock: item.stock - 2 } : item,
      ),
      sales: [localSale, ...base.sales],
      shift: base.shift && { ...base.shift, expectedCash: base.shift.expectedCash + 20 },
    };
    const remote: Data = {
      ...base,
      products: base.products.map((item) =>
        item.id === product.id ? { ...item, stock: item.stock - 3 } : item,
      ),
      sales: [remoteSale, ...base.sales],
      shift: base.shift && { ...base.shift, expectedCash: base.shift.expectedCash + 30 },
    };

    const merged = mergeSyncData(base, local, remote);

    expect(merged.products.find((item) => item.id === product.id)?.stock).toBe(product.stock - 5);
    expect(merged.sales.map((sale) => sale.id)).toContain("local-sale");
    expect(merged.sales.map((sale) => sale.id)).toContain("remote-sale");
    expect(merged.shift?.expectedCash).toBe((base.shift?.expectedCash ?? 0) + 50);
  });
});
