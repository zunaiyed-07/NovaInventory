import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CartItem,
  CustomerLedger,
  Expense,
  Lang,
  PaymentMethod,
  Product,
  ProductCategory,
  Role,
  SaleTransaction,
  ShiftRegister,
  StoreSettings,
  Voucher,
} from "./types";
import {
  addDemoProducts,
  defaultSettings,
  mockCustomers,
  mockExpenses,
  mockProducts,
  mockSales,
  mockShift,
} from "./mock";

const uid = () => Math.random().toString(36).slice(2, 10);

export interface CheckoutInput {
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  customerId?: string;
  mfsProvider?: string;
  mfsTxId?: string;
  voucherCode?: string;
}

export interface Data {
  products: Product[];
  productCategories: ProductCategory[];
  customers: CustomerLedger[];
  sales: SaleTransaction[];
  shift: ShiftRegister | null;
  shiftHistory: ShiftRegister[];
  vouchers: Voucher[];
  expenses: Expense[];
  settings: StoreSettings;
}

interface State extends Data {
  lang: Lang;
  role: Role;
  theme: "light" | "dark";
  setLang: (l: Lang) => void;
  setRole: (r: Role) => void;
  setTheme: (t: "light" | "dark") => void;
  addProductCategory: (label: string) => string | undefined;
  deleteProductCategory: (id: string) => boolean;
  upsertProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  importProducts: (ps: Product[]) => void;
  checkout: (i: CheckoutInput) => SaleTransaction;
  processReturn: (
    saleId: string,
    lines: Record<string, number>,
    mode: "cash" | "voucher",
  ) => { amount: number; voucher?: string };
  addCustomer: (c: Omit<CustomerLedger, "id" | "currentDue">) => void;
  recordRepayment: (customerId: string, amount: number) => void;
  openShift: (openingCash: number) => void;
  addPettyExpense: (reason: string, amount: number) => void;
  addExpense: (expense: Omit<Expense, "id">) => void;
  deleteExpense: (id: string) => void;
  closeShift: (actualCash: number) => ShiftRegister | null;
  setSettings: (s: StoreSettings) => void;
  restore: (d: Partial<Data>) => void;
  syncData: (d: Data) => void;
  resetData: () => void;
}

const seed = (): Data => ({
  products: mockProducts,
  productCategories: [],
  customers: mockCustomers,
  sales: mockSales,
  shift: mockShift(),
  shiftHistory: [],
  vouchers: [],
  expenses: mockExpenses,
  settings: defaultSettings,
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...seed(),
      lang: "en",
      role: "admin",
      theme: "light",
      setLang: (lang) => set({ lang }),
      setRole: (role) => set({ role }),
      setTheme: (theme) => set({ theme }),
      addProductCategory: (label) => {
        const cleanLabel = label.trim();
        if (!cleanLabel) return undefined;
        const existing = get().productCategories.find(
          (category) => category.label.toLocaleLowerCase() === cleanLabel.toLocaleLowerCase(),
        );
        if (existing) return existing.id;
        const category = { id: `custom-${crypto.randomUUID()}`, label: cleanLabel };
        set((s) => ({ productCategories: [...s.productCategories, category] }));
        return category.id;
      },
      deleteProductCategory: (id) => {
        const state = get();
        if (
          !state.productCategories.some((category) => category.id === id) ||
          state.products.some((product) => product.category === id)
        ) {
          return false;
        }
        set((s) => ({
          productCategories: s.productCategories.filter((category) => category.id !== id),
        }));
        return true;
      },
      upsertProduct: (p) =>
        set((s) => ({
          products: s.products.some((x) => x.id === p.id)
            ? s.products.map((x) => (x.id === p.id ? p : x))
            : [p, ...s.products],
        })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
      importProducts: (ps) =>
        set((s) => {
          const bySku = new Map(s.products.map((p) => [p.sku, p]));
          ps.forEach((p) =>
            bySku.set(p.sku, {
              ...(bySku.get(p.sku) ?? {}),
              ...p,
              id: bySku.get(p.sku)?.id ?? p.id,
            }),
          );
          return { products: [...bySku.values()] };
        }),
      checkout: (i) => {
        const s = get();
        const qty = new Map<string, number>();
        for (const item of i.items) {
          if (
            ![item.quantity, item.sellingPrice, item.costPrice, item.discount].every(
              Number.isFinite,
            ) ||
            item.quantity <= 0 ||
            (item.unit === "pcs" && !Number.isInteger(item.quantity)) ||
            item.sellingPrice < 0 ||
            item.costPrice < 0 ||
            item.discount < 0 ||
            item.discount > 100
          ) {
            throw new Error("invalid_checkout");
          }
          qty.set(item.id, (qty.get(item.id) ?? 0) + item.quantity);
        }
        for (const [id, quantity] of qty) {
          const product = s.products.find((item) => item.id === id);
          if (!product || !Number.isFinite(product.stock) || product.stock < quantity) {
            throw new Error("insufficient_stock");
          }
        }
        if (
          ![i.subtotal, i.discountAmount, i.taxAmount, i.total, i.paidAmount].every(
            Number.isFinite,
          ) ||
          i.subtotal < 0 ||
          i.discountAmount < 0 ||
          i.discountAmount > i.subtotal ||
          i.taxAmount < 0 ||
          i.total < 0 ||
          i.paidAmount < 0
        ) {
          throw new Error("invalid_checkout");
        }
        const saleId = uid();
        const timestamp = new Date().toISOString();
        const sale: SaleTransaction = {
          id: saleId,
          invoiceNo: `INV-${Date.now()}-${saleId.toUpperCase()}`,
          timestamp,
          cashierName: s.settings.cashierName,
          items: i.items.map((x) => ({ ...x, returnedQty: 0 })),
          subtotal: i.subtotal,
          taxAmount: i.taxAmount,
          discountAmount: i.discountAmount,
          total: i.total,
          paymentMethod: i.paymentMethod,
          paidAmount: Math.min(i.paidAmount, i.total),
          dueAmount: Math.max(0, i.total - i.paidAmount),
          customerId: i.customerId,
          mfsProvider: i.mfsProvider,
          mfsTxId: i.mfsTxId,
          status: "completed",
        };
        const cashIn =
          i.paymentMethod === "cash" || i.paymentMethod === "credit" ? sale.paidAmount : 0;
        set({
          sales: [sale, ...s.sales],
          products: s.products.map((p) =>
            qty.has(p.id) ? { ...p, stock: p.stock - qty.get(p.id)! } : p,
          ),
          customers:
            sale.dueAmount > 0 && i.customerId
              ? s.customers.map((c) =>
                  c.id === i.customerId ? { ...c, currentDue: c.currentDue + sale.dueAmount } : c,
                )
              : s.customers,
          shift: s.shift ? { ...s.shift, expectedCash: s.shift.expectedCash + cashIn } : s.shift,
          vouchers: i.voucherCode
            ? s.vouchers.map((v) => (v.code === i.voucherCode ? { ...v, used: true } : v))
            : s.vouchers,
        });
        return sale;
      },
      processReturn: (saleId, lines, mode) => {
        const s = get();
        const sale = s.sales.find((x) => x.id === saleId);
        if (!sale) return { amount: 0 };
        const ratio = sale.subtotal > 0 ? sale.total / sale.subtotal : 1;
        let amount = 0;
        const items = sale.items.map((it) => {
          const q = Math.min(lines[it.id] ?? 0, it.quantity - (it.returnedQty ?? 0));
          amount += q * it.sellingPrice * (1 - it.discount / 100) * ratio;
          return { ...it, returnedQty: (it.returnedQty ?? 0) + q };
        });
        amount = Math.round(amount * 100) / 100;
        const allBack = items.every((it) => it.returnedQty === it.quantity);
        const voucher = mode === "voucher" ? `VC-${uid().toUpperCase().slice(0, 6)}` : undefined;
        set({
          sales: s.sales.map((x) =>
            x.id === saleId
              ? {
                  ...x,
                  items,
                  status: allBack ? "returned" : "partial-return",
                  refundedAmount: (x.refundedAmount ?? 0) + amount,
                }
              : x,
          ),
          products: s.products.map((p) =>
            lines[p.id] ? { ...p, stock: p.stock + (lines[p.id] ?? 0) } : p,
          ),
          shift:
            mode === "cash" && s.shift
              ? { ...s.shift, expectedCash: s.shift.expectedCash - amount }
              : s.shift,
          vouchers: voucher
            ? [
                { code: voucher, amount, createdAt: new Date().toISOString(), used: false },
                ...s.vouchers,
              ]
            : s.vouchers,
        });
        return { amount, voucher };
      },
      addCustomer: (c) =>
        set((s) => ({ customers: [{ ...c, id: uid(), currentDue: 0 }, ...s.customers] })),
      recordRepayment: (id, amount) =>
        set((s) => ({
          customers: s.customers.map((c) =>
            c.id === id
              ? {
                  ...c,
                  currentDue: Math.max(0, c.currentDue - amount),
                  lastPaymentDate: new Date().toISOString(),
                }
              : c,
          ),
          shift: s.shift ? { ...s.shift, expectedCash: s.shift.expectedCash + amount } : s.shift,
        })),
      openShift: (openingCash) =>
        set({
          shift: {
            id: uid(),
            status: "open",
            openedAt: new Date().toISOString(),
            openingCash,
            pettyExpenses: [],
            expectedCash: openingCash,
          },
        }),
      addPettyExpense: (reason, amount) =>
        set((s) =>
          s.shift
            ? {
                shift: {
                  ...s.shift,
                  expectedCash: s.shift.expectedCash - amount,
                  pettyExpenses: [
                    ...s.shift.pettyExpenses,
                    { id: uid(), reason, amount, time: new Date().toISOString() },
                  ],
                },
              }
            : {},
        ),
      addExpense: (expense) =>
        set((s) => ({ expenses: [{ ...expense, id: uid() }, ...s.expenses] })),
      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((expense) => expense.id !== id) })),
      closeShift: (actualCash) => {
        const sh = get().shift;
        if (!sh) return null;
        const closed: ShiftRegister = {
          ...sh,
          status: "closed",
          closedAt: new Date().toISOString(),
          actualCash,
          discrepancy: actualCash - sh.expectedCash,
        };
        set((s) => ({ shift: null, shiftHistory: [closed, ...s.shiftHistory] }));
        return closed;
      },
      setSettings: (settings) => set({ settings }),
      restore: (d) =>
        set({
          ...d,
          productCategories: d.productCategories ?? [],
          expenses: d.expenses ?? mockExpenses,
        }),
      syncData: (data) => set(data),
      resetData: () => set(seed()),
    }),
    {
      name: "nova-inventory-v1",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      migrate: (persisted, version) => {
        const data = (persisted ?? {}) as Partial<State>;
        return {
          ...data,
          products: addDemoProducts(data.products ?? []),
          productCategories: data.productCategories ?? [],
          expenses: version < 1 ? mockExpenses : (data.expenses ?? mockExpenses),
        } as State;
      },
    },
  ),
);

export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
export const daysUntil = (ymd?: string) =>
  ymd ? Math.ceil((new Date(ymd).getTime() - Date.now()) / 86400000) : Infinity;
export type StockState = "normal" | "low" | "out";
export const stockState = (p: Product): StockState =>
  p.stock <= 0 ? "out" : p.stock <= p.minStockAlert ? "low" : "normal";
export const isNearExpiry = (p: Product) => daysUntil(p.expiryDate) <= 30;
export const lineProfit = (it: CartItem) => {
  const q = it.quantity - (it.returnedQty ?? 0);
  return (it.sellingPrice * (1 - it.discount / 100) - it.costPrice) * q;
};
