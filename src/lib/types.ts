export type Unit = "pcs" | "kg" | "ltr";
export type Lang = "en" | "bn";
export type Role = "admin" | "cashier";
export type PaymentMethod = "cash" | "card" | "mfs" | "credit";

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: { en: string; bn: string };
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  expiryDate?: string;
  unit: Unit;
}

export interface CartItem extends Product {
  quantity: number;
  discount: number; // percentage per line
  returnedQty?: number;
}

export interface SaleTransaction {
  id: string;
  invoiceNo: string;
  timestamp: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  dueAmount: number;
  customerId?: string;
  mfsProvider?: string;
  mfsTxId?: string;
  status: "completed" | "returned" | "partial-return";
  refundedAmount?: number;
}

export interface CustomerLedger {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
  currentDue: number;
  lastPaymentDate?: string;
}

export interface PettyExpense {
  id: string;
  reason: string;
  amount: number;
  time: string;
}

export interface Expense {
  id: string;
  title: string;
  category: "rent" | "salary" | "electricity" | "utilities" | "maintenance" | "other";
  amount: number;
  date: string;
  note?: string;
}

export interface ShiftRegister {
  id: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  pettyExpenses: PettyExpense[];
  expectedCash: number;
  actualCash?: number;
  discrepancy?: number;
}

export interface Voucher {
  code: string;
  amount: number;
  createdAt: string;
  used: boolean;
}

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  currencySymbol: string;
  receiptFooter: string;
  vatRate: number;
  cashierName: string;
}
