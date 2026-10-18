import type { CartItem, CustomerLedger, Expense, Product, SaleTransaction, ShiftRegister, StoreSettings } from "./types";

const day = (offset: number, h = 11, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const ymd = (offset: number) => day(offset).slice(0, 10);

export const mockProducts: Product[] = [
  { id: "p1", sku: "GRC-001", barcode: "8901000000011", name: { en: "Miniket Rice", bn: "মিনিকেট চাল" }, category: "groceries", costPrice: 62, sellingPrice: 72, stock: 140, minStockAlert: 20, unit: "kg" },
  { id: "p2", sku: "GRC-002", barcode: "8901000000028", name: { en: "Soybean Oil 1L", bn: "সয়াবিন তেল ১লি" }, category: "groceries", costPrice: 158, sellingPrice: 175, stock: 6, minStockAlert: 10, unit: "ltr" },
  { id: "p3", sku: "BEV-001", barcode: "8901000000035", name: { en: "Mineral Water 500ml", bn: "মিনারেল ওয়াটার ৫০০মিলি" }, category: "beverages", costPrice: 12, sellingPrice: 20, stock: 96, minStockAlert: 24, unit: "pcs" },
  { id: "p4", sku: "BEV-002", barcode: "8901000000042", name: { en: "Fresh Milk 1L", bn: "তরল দুধ ১লি" }, category: "beverages", costPrice: 85, sellingPrice: 100, stock: 18, minStockAlert: 8, expiryDate: ymd(9), unit: "ltr" },
  { id: "p5", sku: "SNK-001", barcode: "8901000000059", name: { en: "Potato Chips", bn: "আলুর চিপস" }, category: "snacks", costPrice: 15, sellingPrice: 25, stock: 0, minStockAlert: 12, unit: "pcs" },
  { id: "p6", sku: "HRD-001", barcode: "8901000000066", name: { en: "LED Bulb 12W", bn: "এলইডি বাল্ব ১২ও" }, category: "hardware", costPrice: 140, sellingPrice: 220, stock: 3, minStockAlert: 5, unit: "pcs" },
  { id: "p7", sku: "PRC-001", barcode: "8901000000073", name: { en: "Bath Soap", bn: "গোসলের সাবান" }, category: "personal", costPrice: 38, sellingPrice: 55, stock: 64, minStockAlert: 15, unit: "pcs" },
  { id: "p8", sku: "GRC-003", barcode: "8901000000080", name: { en: "Red Lentils", bn: "মসুর ডাল" }, category: "groceries", costPrice: 105, sellingPrice: 125, stock: 52, minStockAlert: 15, expiryDate: ymd(180), unit: "kg" },
  { id: "p9", sku: "BEV-003", barcode: "8901000000097", name: { en: "Black Tea 400g", bn: "চা পাতা ৪০০গ্রা" }, category: "beverages", costPrice: 190, sellingPrice: 230, stock: 30, minStockAlert: 8, unit: "pcs" },
  { id: "p10", sku: "HRD-002", barcode: "8901000000103", name: { en: "AA Battery (2pk)", bn: "এএ ব্যাটারি (২টি)" }, category: "hardware", costPrice: 45, sellingPrice: 70, stock: 40, minStockAlert: 10, unit: "pcs" },
];

export const mockCustomers: CustomerLedger[] = [
  { id: "c1", name: "Rahim Uddin", phone: "8801711000001", creditLimit: 5000, currentDue: 1850, lastPaymentDate: day(-6) },
  { id: "c2", name: "Karim Hossain", phone: "8801811000002", creditLimit: 3000, currentDue: 2400, lastPaymentDate: day(-12) },
  { id: "c3", name: "Fatema Begum", phone: "8801911000003", creditLimit: 8000, currentDue: 640 },
  { id: "c4", name: "Sumon Ahmed", phone: "8801611000004", creditLimit: 2000, currentDue: 1120, lastPaymentDate: day(-2) },
];

const line = (p: Product, quantity: number): CartItem => ({ ...p, quantity, discount: 0, returnedQty: 0 });
const sale = (n: number, ts: string, items: CartItem[], method: SaleTransaction["paymentMethod"], customerId?: string): SaleTransaction => {
  const subtotal = items.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
  const paid = method === "credit" ? 0 : subtotal;
  return {
    id: `s${n}`, invoiceNo: `INV-${1000 + n}`, timestamp: ts, cashierName: "Nadia", items, subtotal, taxAmount: 0, discountAmount: 0,
    total: subtotal, paymentMethod: method, paidAmount: paid, dueAmount: subtotal - paid, customerId, status: "completed",
  };
};
const P = Object.fromEntries(mockProducts.map((p) => [p.id, p]));

export const mockSales: SaleTransaction[] = [
  sale(1, day(-5, 10), [line(P.p1, 10), line(P.p3, 12)], "cash"),
  sale(2, day(-3, 15), [line(P.p9, 4), line(P.p7, 6)], "mfs"),
  sale(3, day(-2, 18), [line(P.p8, 5), line(P.p2, 3)], "credit", "c3"),
  sale(4, day(-1, 12), [line(P.p6, 2), line(P.p10, 5), line(P.p4, 4)], "card"),
  sale(5, day(0, 9, 30), [line(P.p1, 5), line(P.p7, 3), line(P.p3, 6)], "cash"),
];

const expenseDate = (dayOfMonth: number) => {
  const now = new Date();
  const day = Math.min(dayOfMonth, now.getDate());
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const mockExpenses: Expense[] = [
  { id: "expense-rent", title: "Shop Rent", category: "rent", amount: 18000, date: expenseDate(1), note: "Monthly shop rent" },
  { id: "expense-electricity", title: "Electric Bill", category: "electricity", amount: 3200, date: expenseDate(8), note: "Monthly electricity bill" },
  { id: "expense-staff", title: "Staff Advance", category: "salary", amount: 6500, date: expenseDate(15), note: "Staff salary advance" },
];

export const mockShift = (): ShiftRegister => ({
  id: "sh1", status: "open", openedAt: day(0, 8, 30), openingCash: 3000,
  pettyExpenses: [
    { id: "e1", reason: "Staff tea", amount: 60, time: day(0, 10, 15) },
    { id: "e2", reason: "Minor repair", amount: 250, time: day(0, 11, 40) },
  ],
  expectedCash: 3000 - 310 + mockSales[4].total,
});

export const defaultSettings: StoreSettings = {
  storeName: "Nova Super Shop", address: "House 12, Road 5, Dhanmondi, Dhaka", phone: "+880 1700-000000",
  currencySymbol: "৳", receiptFooter: "Goods once sold are exchangeable within 7 days.", vatRate: 5, cashierName: "Nadia",
};
