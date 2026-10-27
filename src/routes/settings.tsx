import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Database,
  Download,
  FileJson,
  RotateCcw,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Panel } from "@/components/nova/ui";
import { useInstall } from "@/components/nova/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { downloadFile } from "@/lib/download";
import type { StoreSettings } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NovaInventory" },
      {
        name: "description",
        content: "Store configuration, receipt footer, app install and database backup.",
      },
      { property: "og:title", content: "Settings — NovaInventory" },
      {
        property: "og:description",
        content: "Store configuration, receipt footer, app install and database backup.",
      },
    ],
  }),
  component: Settings,
});

const sq = (v: unknown) =>
  v === undefined || v === null
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : `'${String(v).replace(/'/g, "''")}'`;

function Settings() {
  const { t } = useI18n();
  const st = useStore();
  const [f, setF] = useState<StoreSettings>(st.settings);
  const [categoryLabel, setCategoryLabel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { canInstall, install } = useInstall();

  const data = () => ({
    products: st.products,
    productCategories: st.productCategories,
    customers: st.customers,
    sales: st.sales,
    shift: st.shift,
    shiftHistory: st.shiftHistory,
    vouchers: st.vouchers,
    expenses: st.expenses,
    settings: st.settings,
  });
  const stamp = new Date().toISOString().slice(0, 10);

  const sql = () => {
    const out = [
      "-- NovaInventory SQL dump " + new Date().toISOString(),
      "CREATE TABLE products (id TEXT PRIMARY KEY, sku TEXT UNIQUE, barcode TEXT, name_en TEXT, name_bn TEXT, category TEXT, cost_price NUMERIC, selling_price NUMERIC, stock NUMERIC, min_stock_alert NUMERIC, expiry_date DATE, unit TEXT);",
      "CREATE TABLE product_categories (id TEXT PRIMARY KEY, label TEXT NOT NULL);",
      "CREATE TABLE customers (id TEXT PRIMARY KEY, name TEXT, phone TEXT, credit_limit NUMERIC, current_due NUMERIC, last_payment_date TIMESTAMP);",
      "CREATE TABLE sales (id TEXT PRIMARY KEY, invoice_no TEXT UNIQUE, ts TIMESTAMP, cashier TEXT, subtotal NUMERIC, tax NUMERIC, discount NUMERIC, total NUMERIC, payment_method TEXT, paid NUMERIC, due NUMERIC, customer_id TEXT, status TEXT);",
      "CREATE TABLE sale_items (sale_id TEXT, product_id TEXT, quantity NUMERIC, unit_price NUMERIC, discount NUMERIC, returned_qty NUMERIC);",
      "CREATE TABLE business_expenses (id TEXT PRIMARY KEY, title TEXT, category TEXT, amount NUMERIC, date DATE, note TEXT);",
      ...st.products.map(
        (p) =>
          `INSERT INTO products VALUES (${[p.id, p.sku, p.barcode, p.name.en, p.name.bn, p.category, p.costPrice, p.sellingPrice, p.stock, p.minStockAlert, p.expiryDate, p.unit].map(sq).join(", ")});`,
      ),
      ...st.productCategories.map(
        (category) =>
          `INSERT INTO product_categories VALUES (${[category.id, category.label].map(sq).join(", ")});`,
      ),
      ...st.customers.map(
        (c) =>
          `INSERT INTO customers VALUES (${[c.id, c.name, c.phone, c.creditLimit, c.currentDue, c.lastPaymentDate].map(sq).join(", ")});`,
      ),
      ...st.sales.flatMap((s) => [
        `INSERT INTO sales VALUES (${[s.id, s.invoiceNo, s.timestamp, s.cashierName, s.subtotal, s.taxAmount, s.discountAmount, s.total, s.paymentMethod, s.paidAmount, s.dueAmount, s.customerId, s.status].map(sq).join(", ")});`,
        ...s.items.map(
          (i) =>
            `INSERT INTO sale_items VALUES (${[s.id, i.id, i.quantity, i.sellingPrice, i.discount, i.returnedQty ?? 0].map(sq).join(", ")});`,
        ),
      ]),
      ...st.expenses.map(
        (expense) =>
          `INSERT INTO business_expenses VALUES (${[expense.id, expense.title, expense.category, expense.amount, expense.date, expense.note].map(sq).join(", ")});`,
      ),
    ];
    downloadFile(`nova-${stamp}.sql`, out.join("\n"), "application/sql");
  };

  const F = (k: keyof StoreSettings, label: string, type = "text") => (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type={type}
        value={f[k]}
        onChange={(e) =>
          setF({ ...f, [k]: type === "number" ? Number(e.target.value) : e.target.value })
        }
      />
    </label>
  );

  return (
    <>
      <PageHeader title={t.settings.title} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="space-y-3 p-4">
          <div className="text-sm font-medium">{t.settings.store}</div>
          {F("storeName", t.settings.storeName)}
          {F("address", t.settings.address)}
          <div className="grid grid-cols-2 gap-3">
            {F("phone", t.settings.phone)}
            {F("currencySymbol", t.settings.currency)}
            {F("vatRate", t.settings.vat, "number")}
            {F("cashierName", t.settings.cashierName)}
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">{t.settings.footer}</span>
            <Textarea
              value={f.receiptFooter}
              onChange={(e) => setF({ ...f, receiptFooter: e.target.value })}
            />
          </label>
          <Button
            onClick={() => {
              if (!f.storeName.trim()) return toast.error(t.common.required);
              st.setSettings(f);
              toast.success(t.settings.saved);
            }}
          >
            {t.common.save}
          </Button>
        </Panel>
        <div className="space-y-4">
          <Panel className="space-y-3 p-4">
            <div className="text-sm font-medium">{t.settings.categories}</div>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const cleanLabel = categoryLabel.trim();
                if (!cleanLabel) return toast.error(t.common.required);
                const existing = st.productCategories.find(
                  (category) =>
                    category.label.toLocaleLowerCase() === cleanLabel.toLocaleLowerCase(),
                );
                if (existing) return toast.error(t.settings.categoryExists);
                st.addProductCategory(cleanLabel);
                setCategoryLabel("");
                toast.success(t.settings.categoryAdded);
              }}
            >
              <Input
                className="min-w-0 flex-1"
                placeholder={t.settings.categoryPlaceholder}
                value={categoryLabel}
                onChange={(event) => setCategoryLabel(event.target.value)}
                maxLength={40}
              />
              <Button type="submit">{t.settings.addCategory}</Button>
            </form>
            {st.productCategories.length > 0 && (
              <div className="space-y-2">
                {st.productCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm">{category.label}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0 text-danger hover:text-danger"
                      aria-label={`${t.settings.deleteCategory}: ${category.label}`}
                      title={t.settings.deleteCategory}
                      onClick={() => {
                        if (!confirm(`${t.settings.confirmDeleteCategory} "${category.label}"?`))
                          return;
                        if (!st.deleteProductCategory(category.id)) {
                          toast.error(t.settings.categoryInUse);
                          return;
                        }
                        toast.success(t.settings.categoryDeleted);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          {st.role === "admin" && (
            <Panel className="space-y-2 p-4">
              <div className="text-sm font-medium">{t.settings.backup}</div>
              <Button variant="outline" className="w-full justify-start" onClick={sql}>
                <Database className="size-4" />
                {t.settings.sql}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() =>
                  downloadFile(
                    `nova-${stamp}.json`,
                    JSON.stringify(data(), null, 2),
                    "application/json",
                  )
                }
              >
                <FileJson className="size-4" />
                {t.settings.json}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" />
                {t.settings.importJson}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    const d = JSON.parse(await file.text());
                    if (!Array.isArray(d.products)) throw new Error();
                    st.restore(d);
                    if (d.settings) setF(d.settings);
                    toast.success(t.settings.restored);
                  } catch {
                    toast.error(t.common.invalid);
                  }
                }}
              />
              <Button
                variant="ghost"
                className="w-full justify-start text-danger"
                onClick={() => {
                  if (confirm(t.settings.reset + "?")) {
                    st.resetData();
                    setF(useStore.getState().settings);
                  }
                }}
              >
                <RotateCcw className="size-4" />
                {t.settings.reset}
              </Button>
            </Panel>
          )}
          <Panel className="space-y-2 p-4">
            <div className="text-sm font-medium">{t.settings.pwa}</div>
            <p className="text-sm text-muted-foreground">{t.settings.installHint}</p>
            <Button disabled={!canInstall} onClick={install}>
              <Smartphone className="size-4" />
              {t.settings.install}
              <Download className="size-4" />
            </Button>
          </Panel>
        </div>
      </div>
    </>
  );
}
