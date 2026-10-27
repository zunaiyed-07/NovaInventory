import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "@/lib/store";
import { addDemoProducts, mockProducts } from "@/lib/mock";
import { PRODUCT_CATEGORIES, type CartItem } from "@/lib/types";

describe("demo inventory", () => {
  it("adds custom product categories and prevents duplicate labels", () => {
    useStore.getState().resetData();
    const addCategory = useStore.getState().addProductCategory;
    const categoryId = addCategory(" Bakery ");

    expect(categoryId).toBeTruthy();
    expect(useStore.getState().productCategories).toEqual([
      { id: categoryId, label: "Bakery" },
    ]);
    expect(addCategory("bakery")).toBe(categoryId);
    expect(useStore.getState().productCategories).toHaveLength(1);
  });

  it("deletes unused custom categories but keeps categories assigned to products", () => {
    useStore.getState().resetData();
    const store = useStore.getState();
    const categoryId = store.addProductCategory("Seasonal")!;

    expect(store.deleteProductCategory(categoryId)).toBe(true);
    expect(useStore.getState().productCategories).toHaveLength(0);

    const assignedCategoryId = useStore.getState().addProductCategory("Bakery")!;
    useStore.getState().upsertProduct({
      ...useStore.getState().products[0],
      id: "category-test-product",
      sku: "CATEGORY-TEST",
      barcode: "9999999999999",
      category: assignedCategoryId,
    });

    expect(useStore.getState().deleteProductCategory(assignedCategoryId)).toBe(false);
    expect(
      useStore
        .getState()
        .productCategories.some((category) => category.id === assignedCategoryId),
    ).toBe(true);
  });

  it("provides several sample products in every category with unique SKUs and barcodes", () => {
    expect(mockProducts.length).toBeGreaterThan(70);
    for (const category of PRODUCT_CATEGORIES) {
      expect(
        mockProducts.filter((product) => product.category === category).length,
      ).toBeGreaterThanOrEqual(5);
    }
    expect(new Set(mockProducts.map((product) => product.sku)).size).toBe(mockProducts.length);
    expect(new Set(mockProducts.map((product) => product.barcode)).size).toBe(mockProducts.length);
  });

  it("adds missing demo products to an existing inventory without duplicating them", () => {
    const savedProducts = mockProducts.filter((product) => !product.id.startsWith("demo-"));
    const migratedProducts = addDemoProducts(savedProducts);

    expect(migratedProducts).toEqual(mockProducts);
    expect(addDemoProducts(migratedProducts)).toBe(migratedProducts);
  });
});

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

  it("supports fractional quantities for weight-based products", () => {
    const store = useStore.getState();
    const product = { ...store.products[0], unit: "kg" as const, stock: 2, sellingPrice: 100 };
    store.upsertProduct(product);
    const item: CartItem = { ...product, quantity: 0.75, discount: 0 };

    const sale = store.checkout({
      items: [item],
      subtotal: 75,
      discountAmount: 0,
      taxAmount: 0,
      total: 75,
      paymentMethod: "cash",
      paidAmount: 75,
    });

    expect(sale.items[0].quantity).toBe(0.75);
    expect(useStore.getState().products.find((entry) => entry.id === product.id)?.stock).toBe(
      1.25,
    );
  });

  it("rejects fractional quantities for piece-based products", () => {
    const product = { ...useStore.getState().products[0], unit: "pcs" as const };
    const item: CartItem = { ...product, quantity: 0.5, discount: 0 };

    expect(() =>
      useStore.getState().checkout({
        items: [item],
        subtotal: product.sellingPrice * item.quantity,
        discountAmount: 0,
        taxAmount: 0,
        total: product.sellingPrice * item.quantity,
        paymentMethod: "cash",
        paidAmount: product.sellingPrice * item.quantity,
      }),
    ).toThrow("invalid_checkout");
  });
});
