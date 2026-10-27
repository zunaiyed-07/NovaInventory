import type { CartItem, CustomerLedger, Expense, Product, SaleTransaction, ShiftRegister, StoreSettings, Unit } from "./types";

const day = (offset: number, h = 11, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const ymd = (offset: number) => day(offset).slice(0, 10);

const baseMockProducts: Product[] = [
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

type DemoProduct = {
  sku: string;
  en: string;
  bn: string;
  category: string;
  cost: number;
  price: number;
  stock: number;
  unit?: Unit;
};

const demoProductRows: DemoProduct[] = [
  { sku: "GRC-004", en: "Wheat Flour 1kg", bn: "আটা ১ কেজি", category: "groceries", cost: 48, price: 58, stock: 42, unit: "kg" },
  { sku: "GRC-005", en: "Chickpeas 1kg", bn: "ছোলা ১ কেজি", category: "groceries", cost: 82, price: 95, stock: 35, unit: "kg" },
  { sku: "GRC-006", en: "Sugar 1kg", bn: "চিনি ১ কেজি", category: "groceries", cost: 112, price: 125, stock: 60, unit: "kg" },
  { sku: "GRC-007", en: "Salt 1kg", bn: "লবণ ১ কেজি", category: "groceries", cost: 30, price: 38, stock: 90, unit: "kg" },
  { sku: "GRC-008", en: "Mustard Oil 500ml", bn: "সরিষার তেল ৫০০ মিলি", category: "groceries", cost: 115, price: 135, stock: 28, unit: "ltr" },
  { sku: "GRC-009", en: "Flattened Rice 500g", bn: "চিড়া ৫০০ গ্রাম", category: "groceries", cost: 38, price: 48, stock: 32 },
  { sku: "GRC-010", en: "Semolina 500g", bn: "সুজি ৫০০ গ্রাম", category: "groceries", cost: 42, price: 55, stock: 24 },
  { sku: "BEV-004", en: "Orange Juice 1L", bn: "কমলার জুস ১ লিটার", category: "beverages", cost: 95, price: 120, stock: 22, unit: "ltr" },
  { sku: "BEV-005", en: "Cola Drink 1L", bn: "কোলা ১ লিটার", category: "beverages", cost: 75, price: 95, stock: 30, unit: "ltr" },
  { sku: "BEV-006", en: "Mango Juice 250ml", bn: "আমের জুস ২৫০ মিলি", category: "beverages", cost: 18, price: 25, stock: 48 },
  { sku: "BEV-007", en: "Green Tea 25 Bags", bn: "গ্রিন টি ২৫ ব্যাগ", category: "beverages", cost: 135, price: 165, stock: 16 },
  { sku: "BEV-008", en: "Instant Coffee 100g", bn: "ইনস্ট্যান্ট কফি ১০০ গ্রাম", category: "beverages", cost: 180, price: 220, stock: 14 },
  { sku: "BEV-009", en: "Lemon Soda 500ml", bn: "লেবুর সোডা ৫০০ মিলি", category: "beverages", cost: 28, price: 40, stock: 36 },
  { sku: "HRD-003", en: "Claw Hammer", bn: "ক্ল হ্যামার", category: "hardware", cost: 180, price: 240, stock: 12 },
  { sku: "HRD-004", en: "Screwdriver Set", bn: "স্ক্রু ড্রাইভার সেট", category: "hardware", cost: 220, price: 290, stock: 10 },
  { sku: "HRD-005", en: "Combination Pliers", bn: "কম্বিনেশন প্লায়ার্স", category: "hardware", cost: 160, price: 210, stock: 9 },
  { sku: "HRD-006", en: "Steel Nails 100g", bn: "স্টিলের পেরেক ১০০ গ্রাম", category: "hardware", cost: 28, price: 40, stock: 30 },
  { sku: "HRD-007", en: "Measuring Tape 5m", bn: "মেজারিং টেপ ৫ মিটার", category: "hardware", cost: 95, price: 130, stock: 14 },
  { sku: "HRD-008", en: "Electrical Insulation Tape", bn: "ইলেকট্রিক ইনসুলেশন টেপ", category: "hardware", cost: 18, price: 30, stock: 40 },
  { sku: "HRD-009", en: "Adjustable Wrench 8in", bn: "অ্যাডজাস্টেবল রেঞ্চ ৮ ইঞ্চি", category: "hardware", cost: 260, price: 340, stock: 7 },
  { sku: "PRC-002", en: "Toothpaste 100g", bn: "টুথপেস্ট ১০০ গ্রাম", category: "personal", cost: 82, price: 105, stock: 34 },
  { sku: "PRC-003", en: "Shampoo 180ml", bn: "শ্যাম্পু ১৮০ মিলি", category: "personal", cost: 115, price: 145, stock: 26 },
  { sku: "PRC-004", en: "Hand Wash 200ml", bn: "হ্যান্ডওয়াশ ২০০ মিলি", category: "personal", cost: 72, price: 95, stock: 18 },
  { sku: "PRC-005", en: "Toothbrush Medium", bn: "টুথব্রাশ মাঝারি", category: "personal", cost: 32, price: 45, stock: 50 },
  { sku: "PRC-006", en: "Hair Oil 200ml", bn: "চুলের তেল ২০০ মিলি", category: "personal", cost: 95, price: 125, stock: 20 },
  { sku: "SNK-002", en: "Cream Biscuits", bn: "ক্রিম বিস্কুট", category: "snacks", cost: 22, price: 30, stock: 44 },
  { sku: "SNK-003", en: "Salted Crackers", bn: "নোনতা ক্র্যাকার", category: "snacks", cost: 28, price: 38, stock: 30 },
  { sku: "SNK-004", en: "Chocolate Bar", bn: "চকলেট বার", category: "snacks", cost: 35, price: 50, stock: 28 },
  { sku: "SNK-005", en: "Roasted Peanuts 100g", bn: "ভাজা চিনাবাদাম ১০০ গ্রাম", category: "snacks", cost: 32, price: 45, stock: 26 },
  { sku: "SNK-006", en: "Chanachur 200g", bn: "চানাচুর ২০০ গ্রাম", category: "snacks", cost: 38, price: 50, stock: 32 },
  { sku: "SNK-007", en: "Wafer Biscuits", bn: "ওয়েফার বিস্কুট", category: "snacks", cost: 20, price: 30, stock: 36 },
  { sku: "KIT-001", en: "Non-stick Frying Pan", bn: "নন-স্টিক ফ্রাইং প্যান", category: "kitchen", cost: 520, price: 680, stock: 8 },
  { sku: "KIT-002", en: "Stainless Steel Saucepan", bn: "স্টেইনলেস স্টিলের সসপ্যান", category: "kitchen", cost: 430, price: 560, stock: 10 },
  { sku: "KIT-003", en: "Kitchen Knife", bn: "রান্নাঘরের ছুরি", category: "kitchen", cost: 115, price: 160, stock: 18 },
  { sku: "KIT-004", en: "Cutting Board", bn: "কাটিং বোর্ড", category: "kitchen", cost: 140, price: 190, stock: 15 },
  { sku: "KIT-005", en: "Stainless Steel Spoon Set", bn: "স্টিলের চামচ সেট", category: "kitchen", cost: 180, price: 240, stock: 12 },
  { sku: "KIT-006", en: "Tea Strainer", bn: "চায়ের ছাঁকনি", category: "kitchen", cost: 45, price: 65, stock: 24 },
  { sku: "KIT-007", en: "Gas Lighter", bn: "গ্যাস লাইটার", category: "kitchen", cost: 75, price: 105, stock: 20 },
  { sku: "KIT-008", en: "Measuring Cup Set", bn: "মাপার কাপ সেট", category: "kitchen", cost: 125, price: 170, stock: 12 },
  { sku: "ELC-001", en: "USB Charger 20W", bn: "ইউএসবি চার্জার ২০ ওয়াট", category: "electronics", cost: 280, price: 380, stock: 12 },
  { sku: "ELC-002", en: "USB-C Cable 1m", bn: "ইউএসবি-সি কেবল ১ মিটার", category: "electronics", cost: 95, price: 140, stock: 24 },
  { sku: "ELC-003", en: "Power Strip 4 Socket", bn: "৪ সকেটের পাওয়ার স্ট্রিপ", category: "electronics", cost: 390, price: 520, stock: 9 },
  { sku: "ELC-004", en: "Rechargeable Torch", bn: "রিচার্জেবল টর্চ", category: "electronics", cost: 320, price: 430, stock: 10 },
  { sku: "ELC-005", en: "Wireless Mouse", bn: "ওয়্যারলেস মাউস", category: "electronics", cost: 360, price: 480, stock: 8 },
  { sku: "ELC-006", en: "Earphones with Mic", bn: "মাইকসহ ইয়ারফোন", category: "electronics", cost: 220, price: 300, stock: 14 },
  { sku: "ELC-007", en: "Extension Cord 3m", bn: "এক্সটেনশন কর্ড ৩ মিটার", category: "electronics", cost: 250, price: 340, stock: 11 },
  { sku: "ELC-008", en: "LED Night Light", bn: "এলইডি নাইট লাইট", category: "electronics", cost: 120, price: 170, stock: 16 },
  { sku: "PLS-001", en: "Plastic Storage Basket", bn: "প্লাস্টিকের স্টোরেজ ঝুড়ি", category: "plastic", cost: 110, price: 150, stock: 20 },
  { sku: "PLS-002", en: "Water Jug 2L", bn: "পানির জগ ২ লিটার", category: "plastic", cost: 85, price: 120, stock: 18 },
  { sku: "PLS-003", en: "Food Container Set", bn: "খাবারের কৌটার সেট", category: "plastic", cost: 190, price: 260, stock: 12 },
  { sku: "PLS-004", en: "Laundry Mug", bn: "প্লাস্টিকের মগ", category: "plastic", cost: 28, price: 40, stock: 32 },
  { sku: "PLS-005", en: "Water Bucket 10L", bn: "পানির বালতি ১০ লিটার", category: "plastic", cost: 135, price: 180, stock: 14 },
  { sku: "PLS-006", en: "Plastic Hanger 5pc", bn: "প্লাস্টিকের হ্যাঙ্গার ৫টি", category: "plastic", cost: 75, price: 110, stock: 20 },
  { sku: "PLS-007", en: "Lunch Box", bn: "প্লাস্টিকের লাঞ্চ বক্স", category: "plastic", cost: 95, price: 135, stock: 15 },
  { sku: "PLS-008", en: "Water Bottle 1L", bn: "পানির বোতল ১ লিটার", category: "plastic", cost: 65, price: 95, stock: 24 },
  { sku: "FRT-001", en: "Banana 1 Dozen", bn: "কলা ১ ডজন", category: "fruits", cost: 72, price: 90, stock: 18, unit: "kg" },
  { sku: "FRT-002", en: "Apples 1kg", bn: "আপেল ১ কেজি", category: "fruits", cost: 210, price: 260, stock: 14, unit: "kg" },
  { sku: "FRT-003", en: "Oranges 1kg", bn: "কমলা ১ কেজি", category: "fruits", cost: 145, price: 185, stock: 16, unit: "kg" },
  { sku: "FRT-004", en: "Papaya 1kg", bn: "পেঁপে ১ কেজি", category: "fruits", cost: 45, price: 65, stock: 20, unit: "kg" },
  { sku: "FRT-005", en: "Guava 1kg", bn: "পেয়ারা ১ কেজি", category: "fruits", cost: 55, price: 75, stock: 18, unit: "kg" },
  { sku: "FRT-006", en: "Pineapple Each", bn: "আনারস প্রতিটি", category: "fruits", cost: 50, price: 70, stock: 12 },
  { sku: "FRT-007", en: "Lemon 4pc", bn: "লেবু ৪টি", category: "fruits", cost: 24, price: 35, stock: 30 },
  { sku: "FRT-008", en: "Watermelon 1kg", bn: "তরমুজ ১ কেজি", category: "fruits", cost: 35, price: 50, stock: 15, unit: "kg" },
  { sku: "VEG-001", en: "Potato 1kg", bn: "আলু ১ কেজি", category: "vegetables", cost: 32, price: 42, stock: 40, unit: "kg" },
  { sku: "VEG-002", en: "Onion 1kg", bn: "পেঁয়াজ ১ কেজি", category: "vegetables", cost: 68, price: 82, stock: 34, unit: "kg" },
  { sku: "VEG-003", en: "Tomato 1kg", bn: "টমেটো ১ কেজি", category: "vegetables", cost: 52, price: 68, stock: 26, unit: "kg" },
  { sku: "VEG-004", en: "Carrot 1kg", bn: "গাজর ১ কেজি", category: "vegetables", cost: 58, price: 75, stock: 20, unit: "kg" },
  { sku: "VEG-005", en: "Green Chili 250g", bn: "কাঁচা মরিচ ২৫০ গ্রাম", category: "vegetables", cost: 22, price: 32, stock: 28 },
  { sku: "VEG-006", en: "Eggplant 1kg", bn: "বেগুন ১ কেজি", category: "vegetables", cost: 38, price: 52, stock: 22, unit: "kg" },
  { sku: "VEG-007", en: "Spinach Bunch", bn: "পালং শাক আঁটি", category: "vegetables", cost: 18, price: 28, stock: 24 },
  { sku: "VEG-008", en: "Cucumber 1kg", bn: "শসা ১ কেজি", category: "vegetables", cost: 35, price: 48, stock: 20, unit: "kg" },
  { sku: "HOU-001", en: "Laundry Detergent 1kg", bn: "কাপড় কাচার ডিটারজেন্ট ১ কেজি", category: "household", cost: 125, price: 155, stock: 25, unit: "kg" },
  { sku: "HOU-002", en: "Dishwashing Liquid 500ml", bn: "থালা ধোয়ার তরল ৫০০ মিলি", category: "household", cost: 65, price: 88, stock: 20 },
  { sku: "HOU-003", en: "Floor Cleaner 1L", bn: "মেঝে পরিষ্কারক ১ লিটার", category: "household", cost: 110, price: 145, stock: 16, unit: "ltr" },
  { sku: "HOU-004", en: "Cleaning Brush", bn: "পরিষ্কারের ব্রাশ", category: "household", cost: 55, price: 78, stock: 18 },
  { sku: "HOU-005", en: "Garbage Bags 20pc", bn: "ময়লার ব্যাগ ২০টি", category: "household", cost: 48, price: 68, stock: 22 },
  { sku: "HOU-006", en: "Cotton Mop", bn: "তুলার মপ", category: "household", cost: 145, price: 190, stock: 10 },
  { sku: "HOU-007", en: "Mosquito Coil Pack", bn: "মশার কয়েল প্যাক", category: "household", cost: 42, price: 58, stock: 36 },
  { sku: "HOU-008", en: "Air Freshener 300ml", bn: "এয়ার ফ্রেশনার ৩০০ মিলি", category: "household", cost: 135, price: 175, stock: 12 },
  { sku: "STN-001", en: "Ballpoint Pen Blue", bn: "নীল বলপয়েন্ট কলম", category: "stationery", cost: 7, price: 10, stock: 100 },
  { sku: "STN-002", en: "Exercise Book 100 Pages", bn: "১০০ পাতার খাতা", category: "stationery", cost: 32, price: 45, stock: 50 },
  { sku: "STN-003", en: "Pencil HB 5pc", bn: "এইচবি পেন্সিল ৫টি", category: "stationery", cost: 24, price: 35, stock: 40 },
  { sku: "STN-004", en: "Eraser 2pc", bn: "রাবার ২টি", category: "stationery", cost: 8, price: 12, stock: 36 },
  { sku: "STN-005", en: "Marker Pen Black", bn: "কালো মার্কার কলম", category: "stationery", cost: 28, price: 40, stock: 20 },
  { sku: "STN-006", en: "Geometry Box", bn: "জ্যামিতি বক্স", category: "stationery", cost: 105, price: 140, stock: 12 },
  { sku: "STN-007", en: "A4 Paper 100 Sheets", bn: "এ৪ কাগজ ১০০ শিট", category: "stationery", cost: 150, price: 190, stock: 15 },
  { sku: "STN-008", en: "Glue Stick", bn: "আঠার স্টিক", category: "stationery", cost: 25, price: 35, stock: 18 },
];

export const demoProducts: Product[] = demoProductRows.map((product, index) => ({
  id: `demo-${product.sku.toLowerCase()}`,
  sku: product.sku,
  barcode: String(8902000000001 + index),
  name: { en: product.en, bn: product.bn },
  category: product.category,
  costPrice: product.cost,
  sellingPrice: product.price,
  stock: product.stock,
  minStockAlert: product.unit === "kg" || product.unit === "ltr" ? 5 : 8,
  unit: product.unit ?? "pcs",
  ...(["fruits", "vegetables"].includes(product.category) ? { expiryDate: ymd(3) } : {}),
}));

export const addDemoProducts = (products: Product[]) => {
  const knownSkus = new Set(products.map((product) => product.sku));
  const missing = demoProducts.filter((product) => !knownSkus.has(product.sku));
  return missing.length ? [...products, ...missing] : products;
};

export const mockProducts: Product[] = [...baseMockProducts, ...demoProducts];

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
